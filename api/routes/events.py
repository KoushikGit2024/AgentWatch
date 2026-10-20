"""Event query and ingestion API routes."""

from fastapi import APIRouter, HTTPException, Query, status
from typing import Optional, List, Dict, Any
from models.schemas import IngestEventRequest
from services.event_ingestion import EventIngestionService
from repositories.event_repository import EventRepository

router = APIRouter(prefix="/api/v1/events", tags=["Events"])
service = EventIngestionService()
event_repo = EventRepository()


@router.post("", status_code=status.HTTP_201_CREATED)
def ingest_event(payload: IngestEventRequest):
    """
    Ingest a new normalized event from Antigravity adapter or hook dispatcher.
    Applies recursive secret redaction and prevents duplicate insertion.
    """
    doc_id, is_duplicate = service.process_and_store_event(payload)
    return {
        "status": "duplicate" if is_duplicate else "created",
        "id": doc_id,
        "source_event_id": payload.source_event_id,
        "is_duplicate": is_duplicate,
    }


@router.get("")
def list_events(
    session_id: Optional[str] = Query(None, description="Filter events by session UUID"),
    event_type: Optional[str] = Query(None, description="Filter events by type"),
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
):
    """
    List events in reverse chronological order with pagination and filtering.
    """
    events = event_repo.get_events(session_id=session_id, event_type=event_type, limit=limit, skip=skip)
    total = event_repo.count_events(session_id=session_id)
    return {
        "total": total,
        "limit": limit,
        "skip": skip,
        "events": events,
    }
