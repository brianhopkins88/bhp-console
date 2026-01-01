from __future__ import annotations

import logging

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from packages.domain.models.memory import MemoryEmbedding
from app.services.embeddings import embed_text

logger = logging.getLogger(__name__)


def upsert_embedding(
    db: Session,
    source_type: str,
    source_id: str,
    content: str,
    record_metadata: dict | None = None,
) -> MemoryEmbedding | None:
    try:
        embedding = embed_text(content, db)
    except RuntimeError as exc:
        logger.warning("Embedding skipped (%s).", exc)
        return None

    stmt = (
        insert(MemoryEmbedding)
        .values(
            source_type=source_type,
            source_id=source_id,
            content=content,
            embedding=embedding,
            record_metadata=record_metadata,
        )
        .on_conflict_do_update(
            index_elements=["source_type", "source_id"],
            set_={
                "content": content,
                "embedding": embedding,
                "record_metadata": record_metadata,
                "updated_at": func.now(),
            },
        )
        .returning(MemoryEmbedding)
    )
    result = db.execute(stmt).scalar_one()
    db.commit()
    return result


def search_memory(
    db: Session,
    query: str,
    top_k: int = 5,
    source_types: list[str] | None = None,
) -> list[tuple[MemoryEmbedding, float]]:
    embedding = embed_text(query, db)
    distance = MemoryEmbedding.embedding.cosine_distance(embedding).label("distance")
    stmt = select(MemoryEmbedding, distance).order_by(distance).limit(top_k)
    if source_types:
        stmt = stmt.where(MemoryEmbedding.source_type.in_(source_types))
    rows = db.execute(stmt).all()
    results: list[tuple[MemoryEmbedding, float]] = []
    for record, dist in rows:
        score = 1.0 - float(dist)
        results.append((record, score))
    return results
