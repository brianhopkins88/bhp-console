from __future__ import annotations

import logging
import os
from typing import Iterable

import httpx
from openai import OpenAI

from app.core.settings import settings
from app.services.openai_usage import increment_usage

logger = logging.getLogger(__name__)


def _build_http_client() -> httpx.Client:
    verify = True
    if settings.openai_ca_bundle:
        if os.path.exists(settings.openai_ca_bundle):
            verify = settings.openai_ca_bundle
        else:
            logger.warning("OpenAI CA bundle not found at %s", settings.openai_ca_bundle)
    return httpx.Client(verify=verify, timeout=30.0)


def embed_texts(texts: Iterable[str], db) -> list[list[float]]:
    if not settings.openai_api_key:
        raise RuntimeError("OpenAI API key missing")

    http_client = _build_http_client()
    client = OpenAI(api_key=settings.openai_api_key, http_client=http_client)
    try:
        response = client.embeddings.create(
            model=settings.openai_embedding_model,
            input=list(texts),
            dimensions=settings.openai_embedding_dimensions,
        )
    finally:
        http_client.close()

    usage = getattr(response, "usage", None)
    if db is not None and usage and getattr(usage, "total_tokens", None) is not None:
        increment_usage(db, usage.total_tokens)

    embeddings = [item.embedding for item in response.data]
    expected = settings.openai_embedding_dimensions
    for vector in embeddings:
        if expected and len(vector) != expected:
            logger.warning(
                "Unexpected embedding size: got %s expected %s",
                len(vector),
                expected,
            )
    return embeddings


def embed_text(text: str, db) -> list[float]:
    return embed_texts([text], db)[0]
