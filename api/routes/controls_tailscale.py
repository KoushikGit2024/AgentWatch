"""FastAPI routes for Dynamic Tailscale Port Forwarding & Routing."""

import logging
from typing import Any, Dict
from fastapi import APIRouter, HTTPException, status

from models.schemas import PortForwardListResponse, PortForwardRequest
from services.tailscale_service import tailscale_service

logger = logging.getLogger("api.routes.controls_tailscale")

router = APIRouter(prefix="/api/v1/tailscale", tags=["Tailscale Port Forwarding"])


@router.get("/status")
def get_tailscale_status() -> Dict[str, Any]:
    """Return overall Tailscale connection status, tailnet host, and funnel safety verification."""
    return tailscale_service.get_status()


@router.get("/ports", response_model=PortForwardListResponse)
def list_port_forwards() -> PortForwardListResponse:
    """List all currently active served port tunnels."""
    st = tailscale_service.get_status()
    forwards = tailscale_service.list_forwards()
    return PortForwardListResponse(
        success=True,
        tailnet_hostname=st.get("tailnet_hostname"),
        connected=st.get("connected", False),
        funnel_disabled_verified=st.get("funnel_disabled_verified", True),
        forwards=forwards,
    )


@router.post("/ports")
def create_port_forward(payload: PortForwardRequest) -> Dict[str, Any]:
    """
    Forward a local port over Tailnet HTTPS.
    Example: local_port=5173 -> https://<node>.ts.net:5173
    """
    res = tailscale_service.add_forward(
        local_port=payload.local_port,
        external_port=payload.external_port,
        label=payload.label,
    )
    if not res.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=res.get("error", "Failed to forward port"),
        )
    return res


@router.delete("/ports/{port}")
def delete_port_forward(port: int) -> Dict[str, Any]:
    """
    Stop forwarding and unbind a specific port from Tailscale Serve.
    """
    res = tailscale_service.remove_forward(external_port=port)
    if not res.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=res.get("error", f"Could not stop port {port}"),
        )
    return res

