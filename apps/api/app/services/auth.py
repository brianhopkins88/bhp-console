from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hashlib
import secrets
from typing import Tuple

from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.settings import settings
from packages.domain.models.auth import AuthSession, AuthUser

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return _pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return _pwd_context.verify(password, password_hash)


def hash_recovery_answer(answer: str) -> str:
    return _pwd_context.hash(answer)


def verify_recovery_answer(answer: str, answer_hash: str) -> bool:
    return _pwd_context.verify(answer, answer_hash)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_user(db: Session, user_id: str, password: str, role: str = "admin") -> AuthUser:
    user = AuthUser(
        user_id=user_id.strip(),
        password_hash=hash_password(password),
        role=role,
        password_updated_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def ensure_bootstrap_user(db: Session) -> AuthUser | None:
    if not settings.auth_bootstrap_user_id or not settings.auth_bootstrap_password:
        return None
    existing = db.execute(select(AuthUser).limit(1)).scalar_one_or_none()
    if existing:
        return None
    return create_user(
        db,
        user_id=settings.auth_bootstrap_user_id,
        password=settings.auth_bootstrap_password,
        role="admin",
    )


def authenticate_user(db: Session, user_id: str, password: str) -> AuthUser | None:
    user = db.execute(
        select(AuthUser).where(AuthUser.user_id == user_id)
    ).scalar_one_or_none()
    if not user or user.disabled_at is not None:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def create_session(
    db: Session,
    user: AuthUser,
    user_agent: str | None,
    ip_address: str | None,
) -> Tuple[str, AuthSession]:
    token = secrets.token_urlsafe(32)
    token_hash = _hash_token(token)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.auth_session_ttl_hours)
    session = AuthSession(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
        user_agent=user_agent,
        ip_address=ip_address,
    )
    db.add(session)
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)
    return token, session


def get_session_by_token(db: Session, token: str) -> AuthSession | None:
    token_hash = _hash_token(token)
    now = datetime.now(timezone.utc)
    stmt = (
        select(AuthSession)
        .where(
            AuthSession.token_hash == token_hash,
            AuthSession.revoked_at.is_(None),
            AuthSession.expires_at > now,
        )
        .limit(1)
    )
    session = db.execute(stmt).scalar_one_or_none()
    if session:
        session.last_seen_at = now
        db.commit()
    return session


def revoke_session(db: Session, session: AuthSession) -> None:
    session.revoked_at = datetime.now(timezone.utc)
    db.commit()


def revoke_other_sessions(db: Session, user: AuthUser, current_session_id: int) -> None:
    now = datetime.now(timezone.utc)
    stmt = (
        select(AuthSession)
        .where(
            AuthSession.user_id == user.id,
            AuthSession.id != current_session_id,
            AuthSession.revoked_at.is_(None),
        )
    )
    for session in db.execute(stmt).scalars():
        session.revoked_at = now
    db.commit()


def revoke_all_sessions(db: Session, user: AuthUser) -> None:
    now = datetime.now(timezone.utc)
    sessions = db.execute(
        select(AuthSession).where(
            AuthSession.user_id == user.id,
            AuthSession.revoked_at.is_(None),
        )
    ).scalars()
    for session in sessions:
        session.revoked_at = now
    db.commit()
