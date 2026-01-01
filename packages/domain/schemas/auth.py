from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AuthLoginRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class AuthSessionOut(BaseModel):
    user_id: str
    role: str
    expires_at: datetime


class AuthUserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: str
    role: str
    created_at: datetime
    last_login_at: datetime | None
    password_updated_at: datetime | None


class AuthChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)


class AuthChangeUserIdRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_user_id: str = Field(..., min_length=1)


class AuthRecoverySetupRequest(BaseModel):
    question: str = Field(..., min_length=4)
    answer: str = Field(..., min_length=1)


class AuthRecoveryMeOut(BaseModel):
    user_id: str
    question: str | None


class AuthRecoveryQuestionOut(BaseModel):
    user_id: str
    question: str | None


class AuthRecoveryResetRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    answer: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)


class AuthLogoutResponse(BaseModel):
    status: str = "ok"
