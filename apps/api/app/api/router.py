from fastapi import APIRouter

from app.api.v1.assets import router as assets_router
from app.api.v1.agent_runs import router as agent_runs_router
from app.api.v1.approvals import router as approvals_router
from app.api.v1.site_intake import router as site_intake_router
from app.api.v1.memory import router as memory_router
from app.api.v1.tools import router as tools_router
from app.api.v1.site_ops import router as site_ops_router
from app.api.v1.openai import router as openai_router
from app.api.v1.health import router as health_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(assets_router, tags=["assets"])
api_router.include_router(agent_runs_router, tags=["agent-runs"])
api_router.include_router(approvals_router, tags=["approvals"])
api_router.include_router(site_intake_router, tags=["site-intake"])
api_router.include_router(memory_router, tags=["memory"])
api_router.include_router(tools_router, tags=["tools"])
api_router.include_router(site_ops_router, tags=["site-ops"])
api_router.include_router(openai_router, tags=["openai"])
