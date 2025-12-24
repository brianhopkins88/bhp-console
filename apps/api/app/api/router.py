from fastapi import APIRouter

from app.api.v1.assets import router as assets_router
from app.api.v1.openai import router as openai_router
from app.api.v1.health import router as health_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(assets_router, tags=["assets"])
api_router.include_router(openai_router, tags=["openai"])
