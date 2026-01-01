from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    app_name: str = "BHP Console API"
    api_v1_prefix: str = "/api/v1"
    cors_origins: list[str] = ["http://localhost:3000"]
    database_url: str = "postgresql+psycopg://bhp:bhp@localhost:5432/bhp"
    assets_storage_root: str = str(PROJECT_ROOT / "storage")
    assets_originals_dir: str = str(PROJECT_ROOT / "storage" / "library" / "originals")
    assets_derived_dir: str = str(PROJECT_ROOT / "storage" / "library" / "derived")
    assets_derivatives_version: int = 1
    assets_derivative_ratios: list[str] = ["3:2", "5:7", "1:1"]
    assets_derivative_widths: list[int] = [800, 1200, 2000]
    openai_api_key: str | None = None
    openai_tagging_model: str = "gpt-5-mini"
    openai_tagging_prompt_version: str = "2025-02-05"
    openai_tagging_schema_version: str = "v1"
    openai_tagging_image_max_width: int = 512
    openai_embedding_model: str = "text-embedding-3-small"
    openai_embedding_dimensions: int = 1536
    openai_ca_bundle: str | None = None
    openai_token_budget: int = 1_000_000
    api_basic_auth_user: str | None = None
    api_basic_auth_pass: str | None = None
    auth_bootstrap_user_id: str | None = None
    auth_bootstrap_password: str | None = None
    auth_session_cookie_name: str = "bhp_session"
    auth_session_ttl_hours: int = 24
    auth_session_cookie_secure: bool = False
    auth_session_cookie_samesite: str = "lax"

    model_config = SettingsConfigDict(
        env_prefix="BHP_",
        env_file=str(PROJECT_ROOT / ".env"),
        case_sensitive=False,
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("assets_derivative_ratios", mode="before")
    @classmethod
    def split_derivative_ratios(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [ratio.strip() for ratio in value.split(",") if ratio.strip()]
        return value

    @field_validator("assets_derivative_widths", mode="before")
    @classmethod
    def split_derivative_widths(cls, value: str | list[int]) -> list[int]:
        if isinstance(value, str):
            return [int(width.strip()) for width in value.split(",") if width.strip()]
        return value


settings = Settings()
