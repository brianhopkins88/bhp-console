from __future__ import annotations

import secrets

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from app.core.settings import settings

_security = HTTPBasic(auto_error=False)


def require_api_auth(
    credentials: HTTPBasicCredentials | None = Depends(_security),
) -> None:
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
