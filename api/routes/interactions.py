"""API endpoints for dynamic agent interaction requests, choices, and capabilities."""

from fastapi import APIRouter, HTTPException, Query, status
from typing import List, Optional, Dict, Any
from models.schemas import (
    InteractionDocument,
    SubmitInteractionRequest,
    CapabilityItem,
)
from services.interaction_service import interaction_service

router = APIRouter(prefix="/api/v1/interactions", tags=["Dynamic Interactions"])


@router.get("/capabilities", response_model=List[CapabilityItem])
def get_capabilities():
    """
    Return live capability registry indicating supported, unavailable, or native-only actions.
    """
    return interaction_service.get_capabilities()


@router.get("/pending")
def list_pending_interactions(session_id: Optional[str] = Query(None, description="Filter by session UUID")):
    """
    List active pending interaction requests awaiting user response on mobile.
    """
    pending = interaction_service.list_pending(session_id=session_id)
    return {
        "count": len(pending),
        "interactions": pending,
    }


@router.get("/{interaction_id}")
def get_interaction_details(interaction_id: str):
    """Retrieve details of a specific interaction request."""
    item = interaction_service.get_interaction(interaction_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interaction request not found")
    return item


@router.post("", status_code=status.HTTP_201_CREATED)
def create_interaction(doc: InteractionDocument):
    """
    Create a new dynamic interaction request (e.g., from agent hook, tool call, or question).
    """
    doc_id, is_dup = interaction_service.create_interaction(doc)
    return {
        "status": "duplicate" if is_dup else "created",
        "id": doc_id,
        "interaction_id": doc.interaction_id,
    }


@router.post("/{interaction_id}/respond")
def respond_to_interaction(interaction_id: str, payload: SubmitInteractionRequest):
    """
    Submit answer to a pending interaction (selected option, custom text, or form values).
    """
    res = interaction_service.submit_response(interaction_id, payload)
    if not res.get("success"):
        error_code = status.HTTP_400_BAD_REQUEST
        if res.get("status") == "not_found":
            error_code = status.HTTP_404_NOT_FOUND
        elif res.get("status") == "stale_interaction":
            error_code = status.HTTP_409_CONFLICT
        raise HTTPException(status_code=error_code, detail=res.get("error"))
    return res
