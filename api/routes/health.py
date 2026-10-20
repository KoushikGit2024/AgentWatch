"""Health and readiness routes."""

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from config.database import check_mongo_connection
from integrations.antigravity.adapter import antigravity_adapter
from integrations.antigravity.capabilities import get_verified_capabilities
from services.remote_access import remote_access_service

router = APIRouter(tags=["Health"])


@router.get("/health")
def get_health():
    """
    Liveness check indicating whether the AgentWatch process is responsive.
    """
    return {
        "status": "healthy",
        "service": "AgentWatch",
        "version": "2.0.0",
    }


@router.get("/ready")
def get_readiness():
    """
    Readiness check distinguishing between backend availability, MongoDB connectivity,
    and Antigravity IDE connection state.
    """
    mongo_status = check_mongo_connection()
    ag_status = antigravity_adapter.get_status()
    tailscale_status = remote_access_service.get_tailscale_status()
    capabilities = get_verified_capabilities()

    is_ready = mongo_status["status"] == "connected"
    http_code = status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE

    return JSONResponse(
        status_code=http_code,
        content={
            "ready": is_ready,
            "database": mongo_status,
            "antigravity": ag_status,
            "tailscale": tailscale_status,
            "capabilities": capabilities,
        }
    )
