from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_api_auth
from app.core.settings import settings
from app.db.session import get_db
from app.services.auth import (
    authenticate_user,
    create_session,
    get_session_by_token,
    hash_password,
    hash_recovery_answer,
    revoke_all_sessions,
    revoke_other_sessions,
    revoke_session,
    verify_recovery_answer,
)
from packages.domain.models.auth import AuthUser
from packages.domain.schemas.auth import (
    AuthChangePasswordRequest,
    AuthChangeUserIdRequest,
    AuthLoginRequest,
    AuthLogoutResponse,
    AuthRecoveryMeOut,
    AuthRecoveryQuestionOut,
    AuthRecoveryResetRequest,
    AuthRecoverySetupRequest,
    AuthSessionOut,
    AuthUserOut,
)

router = APIRouter()


def _set_session_cookie(response: Response, token: str, max_age: int) -> None:
    response.set_cookie(
        key=settings.auth_session_cookie_name,
        value=token,
        httponly=True,
        secure=settings.auth_session_cookie_secure,
        samesite=settings.auth_session_cookie_samesite,
        max_age=max_age,
        path="/",
    )


def _clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.auth_session_cookie_name,
        path="/",
        samesite=settings.auth_session_cookie_samesite,
    )


@router.post("/auth/login", response_model=AuthSessionOut)
def login(
    payload: AuthLoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> AuthSessionOut:
    user_id = payload.user_id.strip()
    user = authenticate_user(db, user_id, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token, session = create_session(
        db,
        user=user,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    ttl_seconds = settings.auth_session_ttl_hours * 60 * 60
    _set_session_cookie(response, token, ttl_seconds)
    return AuthSessionOut(user_id=user.user_id, role=user.role, expires_at=session.expires_at)


@router.post("/auth/logout", response_model=AuthLogoutResponse)
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    user: AuthUser | None = Depends(require_api_auth),
) -> AuthLogoutResponse:
    token = request.cookies.get(settings.auth_session_cookie_name)
    if token:
        session = get_session_by_token(db, token)
        if session:
            revoke_session(db, session)
    _clear_session_cookie(response)
    return AuthLogoutResponse()


@router.get("/auth/me", response_model=AuthUserOut)
def me(user: AuthUser | None = Depends(require_api_auth)) -> AuthUserOut:
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    return AuthUserOut.model_validate(user)


@router.post("/auth/change-password", response_model=AuthUserOut)
def change_password(
    payload: AuthChangePasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: AuthUser | None = Depends(require_api_auth),
) -> AuthUserOut:
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    if not authenticate_user(db, user.user_id, payload.current_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.password_hash = hash_password(payload.new_password)
    user.password_updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    token = request.cookies.get(settings.auth_session_cookie_name)
    if token:
        session = get_session_by_token(db, token)
        if session:
            revoke_other_sessions(db, user, session.id)
    return AuthUserOut.model_validate(user)


@router.post("/auth/change-user-id", response_model=AuthUserOut)
def change_user_id(
    payload: AuthChangeUserIdRequest,
    db: Session = Depends(get_db),
    user: AuthUser | None = Depends(require_api_auth),
) -> AuthUserOut:
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    if not authenticate_user(db, user.user_id, payload.current_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    next_user_id = payload.new_user_id.strip()
    if not next_user_id:
        raise HTTPException(status_code=400, detail="New user ID is required")
    existing = db.execute(
        select(AuthUser).where(AuthUser.user_id == next_user_id)
    ).scalar_one_or_none()
    if existing and existing.id != user.id:
        raise HTTPException(status_code=400, detail="User ID is already in use")
    user.user_id = next_user_id
    db.commit()
    db.refresh(user)
    return AuthUserOut.model_validate(user)


@router.post("/auth/recovery/setup", response_model=AuthUserOut)
def setup_recovery(
    payload: AuthRecoverySetupRequest,
    db: Session = Depends(get_db),
    user: AuthUser | None = Depends(require_api_auth),
) -> AuthUserOut:
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    user.recovery_question = payload.question.strip()
    user.recovery_answer_hash = hash_recovery_answer(payload.answer)
    user.recovery_updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return AuthUserOut.model_validate(user)


@router.get("/auth/recovery/me", response_model=AuthRecoveryMeOut)
def get_recovery_me(
    db: Session = Depends(get_db),
    user: AuthUser | None = Depends(require_api_auth),
) -> AuthRecoveryMeOut:
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    return AuthRecoveryMeOut(user_id=user.user_id, question=user.recovery_question)


@router.get("/auth/recovery/question", response_model=AuthRecoveryQuestionOut)
def get_recovery_question(
    user_id: str,
    db: Session = Depends(get_db),
) -> AuthRecoveryQuestionOut:
    user = db.execute(
        select(AuthUser).where(AuthUser.user_id == user_id)
    ).scalar_one_or_none()
    if not user or not user.recovery_question:
        raise HTTPException(status_code=404, detail="Recovery question not set")
    return AuthRecoveryQuestionOut(user_id=user.user_id, question=user.recovery_question)


@router.post("/auth/recovery/reset", response_model=AuthUserOut)
def reset_with_recovery(
    payload: AuthRecoveryResetRequest,
    db: Session = Depends(get_db),
) -> AuthUserOut:
    user = db.execute(
        select(AuthUser).where(AuthUser.user_id == payload.user_id)
    ).scalar_one_or_none()
    if not user or user.disabled_at is not None:
        raise HTTPException(status_code=400, detail="Invalid recovery credentials")
    if not user.recovery_answer_hash:
        raise HTTPException(status_code=400, detail="Recovery is not configured")
    if not verify_recovery_answer(payload.answer, user.recovery_answer_hash):
        raise HTTPException(status_code=400, detail="Recovery answer is incorrect")
    user.password_hash = hash_password(payload.new_password)
    user.password_updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    revoke_all_sessions(db, user)
    return AuthUserOut.model_validate(user)
