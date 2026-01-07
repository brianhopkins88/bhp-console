from fastapi import APIRouter, Depends

from app.api.deps import require_api_auth
from app.api.v1.assets import router as assets_router
from app.api.v1.agent_runs import router as agent_runs_router
from app.api.v1.approvals import router as approvals_router
from app.api.v1.auth import router as auth_router
from app.api.v1.guardrails import router as guardrails_router
from app.api.v1.site_intake import router as site_intake_router
from app.api.v1.memory import router as memory_router
from app.api.v1.tools import router as tools_router
from app.api.v1.site_ops import router as site_ops_router
from app.api.v1.openai import router as openai_router
from app.api.v1.health import router as health_router
from app.api.v1.page_config import router as page_config_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(auth_router, tags=["auth"])
api_router.include_router(
    assets_router, tags=["assets"], dependencies=[Depends(require_api_auth)]
)
api_router.include_router(
    agent_runs_router, tags=["agent-runs"], dependencies=[Depends(require_api_auth)]
)
api_router.include_router(
    approvals_router, tags=["approvals"], dependencies=[Depends(require_api_auth)]
)
api_router.include_router(
    site_intake_router, tags=["site-intake"], dependencies=[Depends(require_api_auth)]
)
api_router.include_router(
    memory_router, tags=["memory"], dependencies=[Depends(require_api_auth)]
)
api_router.include_router(
    tools_router, tags=["tools"], dependencies=[Depends(require_api_auth)]
)
api_router.include_router(
    site_ops_router, tags=["site-ops"], dependencies=[Depends(require_api_auth)]
)
api_router.include_router(
    openai_router, tags=["openai"], dependencies=[Depends(require_api_auth)]
)
api_router.include_router(
    page_config_router, tags=["page-config"], dependencies=[Depends(require_api_auth)]
)
api_router.include_router(
    guardrails_router, tags=["guardrails"], dependencies=[Depends(require_api_auth)]
)
