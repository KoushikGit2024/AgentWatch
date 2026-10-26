"""Event query and ingestion API routes."""

from fastapi import APIRouter, HTTPException, Query, status
from typing import Optional, List, Dict, Any
from models.schemas import IngestEventRequest, RecoveryItem, ReconcileActionRequest, EventDocument
from services.event_ingestion import EventIngestionService
from repositories.event_repository import EventRepository
from repositories.idempotency_repository import IdempotencyRepository
from repositories.interaction_repository import InteractionRepository
from integrations.antigravity.adapter import antigravity_adapter
import datetime

router = APIRouter(prefix="/api/v1/events", tags=["Events"])
service = EventIngestionService()
event_repo = EventRepository()
idemp_repo = IdempotencyRepository()
interaction_repo = InteractionRepository()


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
    category: Optional[str] = Query(None, description="Filter events by category"),
    search: Optional[str] = Query(None, description="Search event summaries"),
    correlation_id: Optional[str] = Query(None, description="Filter by correlation ID"),
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
):
    """
    List events in reverse chronological order with pagination and multi-dimensional filtering.
    """
    events = event_repo.get_events(
        session_id=session_id,
        event_type=event_type,
        category=category,
        search=search,
        correlation_id=correlation_id,
        limit=limit,
        skip=skip,
    )
    total = event_repo.count_events(
        session_id=session_id, event_type=event_type, category=category, search=search
    )
    return {
        "total": total,
        "limit": limit,
        "skip": skip,
        "events": events,
    }


@router.get("/trace/{correlation_id}")
def get_action_trace(correlation_id: str):
    """
    Correlate all lifecycle transitions associated with a specific action or idempotency key.
    """
    events = event_repo.get_events(correlation_id=correlation_id, limit=50)
    # Also fetch idempotency record if exists
    idemp_record = idemp_repo.collection.find_one({"idempotency_key": correlation_id})
    if idemp_record and "_id" in idemp_record:
        idemp_record["_id"] = str(idemp_record["_id"])

    return {
        "correlation_id": correlation_id,
        "event_count": len(events),
        "lifecycle_events": events,
        "idempotency_record": idemp_record,
    }


@router.get("/recovery-items", response_model=List[RecoveryItem])
def list_recovery_items(session_id: Optional[str] = Query(None)):
    """
    Analyze active system state, failed operations, and pending requests to generate
    an evidence-based list of actionable recovery items.
    """
    items: List[RecoveryItem] = []

    # 1. Check pending interactions awaiting user choice
    pending_interactions = interaction_repo.list_pending_interactions(session_id=session_id)
    for p in pending_interactions:
        items.append(
            RecoveryItem(
                id=f"rec-pending-{p['interaction_id']}",
                title="Pending Agent Decision Required",
                severity="warning",
                description=f"Agent is awaiting user input for: '{p.get('title', 'Question')}'",
                what_happened="The agent paused execution and issued a choice or input question.",
                what_is_known="The question schema and choices are persisted in MongoDB awaiting submission.",
                what_is_unknown="Whether the user wishes to approve an option or provide custom guidance.",
                is_retry_safe=True,
                recommended_action="Open the decision card and submit your response.",
                action_type="open_interaction",
                context={"interaction_id": p["interaction_id"], "kind": p.get("kind")},
            )
        )

    # 2. Check Antigravity CDP connection state
    ag_status = antigravity_adapter.get_status()
    if not ag_status.get("cdp", {}).get("connected", False):
        items.append(
            RecoveryItem(
                id="rec-cdp-disconnected",
                title="Antigravity CDP Disconnected",
                severity="critical",
                description="Antigravity remote debugging port (9000) is not responding.",
                what_happened="AgentWatch cannot communicate with the desktop IDE via Chrome DevTools Protocol.",
                what_is_known="FastAPI and MongoDB are online, but viewport capture and live dispatch are paused.",
                what_is_unknown="Whether Antigravity is running without '--remote-debugging-port=9000' or closed.",
                is_retry_safe=True,
                recommended_action="Restart Antigravity with '--remote-debugging-port=9000' and recheck.",
                action_type="recheck_connection",
                context={"configured_ports": "9000"},
            )
        )

    # 3. Check for crashed / in-progress idempotency records
    crashed_keys = list(idemp_repo.collection.find({"status": "in_progress"}).limit(10))
    for k in crashed_keys:
        key_name = k.get("idempotency_key", "unknown")
        scope = k.get("scope", "unknown")
        items.append(
            RecoveryItem(
                id=f"rec-in-progress-{key_name}",
                title="Interrupted Operation in Progress",
                severity="warning",
                description=f"Operation in scope '{scope}' was reserved but outcome is unconfirmed.",
                what_happened="A request reserved an idempotency key, but a server restart or timeout occurred before completion.",
                what_is_known="The request payload was fingerprinted and stored in MongoDB.",
                what_is_unknown="Whether the operation reached Antigravity or was dropped before execution.",
                is_retry_safe=False,
                recommended_action="Inspect desktop IDE to verify if action executed, then mark reconciled.",
                action_type="reconcile_manual",
                context={"scope": scope, "idempotency_key": key_name},
            )
        )

    return items


@router.post("/reconcile-action")
def reconcile_action(payload: ReconcileActionRequest):
    """
    Mark an uncertain or crashed in-progress action as user-reconciled.
    Audits user-reported outcome without falsely claiming machine verification.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    res = idemp_repo.collection.update_one(
        {"scope": payload.scope, "idempotency_key": payload.idempotency_key},
        {
            "$set": {
                "status": "user_reconciled",
                "resolution_notes": payload.resolution_notes,
                "reported_outcome": payload.reported_outcome,
                "reconciled_at": now,
                "updated_at": now,
            }
        },
    )
    if res.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Idempotency record not found"
        )

    # Record reconciliation audit event in timeline
    event_repo.insert_event(
        EventDocument(
            session_id="default_session",
            event_type="RecoveryAction",
            category="recovery",
            summary=f"Manual reconciliation for {payload.scope}: {payload.reported_outcome}",
            execution_state="completion_confirmed",
            correlation_id=payload.idempotency_key,
            timestamp=now,
            source="mobile_user",
            source_confidence="declared",
            sanitized_payload={"notes": payload.resolution_notes, "scope": payload.scope},
        )
    )

    return {
        "success": True,
        "message": "Action marked as manually reconciled.",
        "idempotency_key": payload.idempotency_key,
        "scope": payload.scope,
    }
