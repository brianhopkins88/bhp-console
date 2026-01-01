from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from packages.domain.schemas.memory import MemorySearchRequest, MemorySearchResult
from app.services.memory import search_memory

router = APIRouter()


@router.post("/memory/search", response_model=list[MemorySearchResult])
def search_memory_endpoint(
    payload: MemorySearchRequest,
    db: Session = Depends(get_db),
) -> list[MemorySearchResult]:
    try:
        results = search_memory(
            db,
            query=payload.query,
            top_k=payload.top_k,
            source_types=payload.source_types,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    response: list[MemorySearchResult] = []
    for record, score in results:
        response.append(
            MemorySearchResult(
                id=record.id,
                source_type=record.source_type,
                source_id=record.source_id,
                content=record.content,
                score=score,
                record_metadata=record.record_metadata,
                created_at=record.created_at,
                updated_at=record.updated_at,
            )
        )
    return response
