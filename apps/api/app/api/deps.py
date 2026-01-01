from __future__ import annotations

import secrets

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from sqlalchemy.orm import Session

from app.core.settings import settings
from app.db.session import get_db
from app.services.auth import get_session_by_token
from packages.domain.models.approvals import Approval
from packages.domain.models.auth import AuthUser

_security = HTTPBasic(auto_error=False)


def _verify_basic_auth(credentials: HTTPBasicCredentials | None) -> None:
    if not settings.api_basic_auth_user or not settings.api_basic_auth_pass:
        return
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
            headers={"WWW-Authenticate": "Basic"},
        )
    user_ok = secrets.compare_digest(credentials.username, settings.api_basic_auth_user)
    pass_ok = secrets.compare_digest(credentials.password, settings.api_basic_auth_pass)
    if not (user_ok and pass_ok):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
            headers={"WWW-Authenticate": "Basic"},
        )


def _get_session_user(request: Request, db: Session) -> AuthUser | None:
    token = request.cookies.get(settings.auth_session_cookie_name)
    if not token:
        return None
    session = get_session_by_token(db, token)
    if session is None:
        return None
    user = db.get(AuthUser, session.user_id)
    if user is None or user.disabled_at is not None:
        return None
    return user


def require_api_auth(
    request: Request,
    db: Session = Depends(get_db),
    credentials: HTTPBasicCredentials | None = Depends(_security),
) -> AuthUser | None:
    user = _get_session_user(request, db)
    if user:
        return user
    _verify_basic_auth(credentials)
    if settings.api_basic_auth_user and settings.api_basic_auth_pass:
        return None
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")


def require_commit_approval(
    commit_classification: str | None,
    approval_id: int | None,
    action: str,
    db: Session,
) -> Approval | None:
    if commit_classification == "safe_auto_commit":
        return None
    if approval_id is None:
        raise HTTPException(status_code=409, detail="Approval required for canonical change")
    approval = db.get(Approval, approval_id)
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")
    if approval.action != action:
        raise HTTPException(status_code=400, detail="Approval does not match action")
    if approval.status != "approved":
        raise HTTPException(status_code=409, detail="Approval not granted")
    return approval
