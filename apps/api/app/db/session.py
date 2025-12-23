from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from typing import Iterator

from sqlalchemy.orm import Session, sessionmaker

from app.core.settings import settings


def _build_engine_url() -> str:
    return settings.database_url


def _get_connect_args() -> dict:
    url = make_url(_build_engine_url())
    if url.get_backend_name() == "sqlite":
        return {"check_same_thread": False}
    return {}


engine = create_engine(
    _build_engine_url(),
    pool_pre_ping=True,
    connect_args=_get_connect_args(),
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, class_=Session)


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
