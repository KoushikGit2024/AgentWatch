"""Event ingestion service coordinating normalization, redaction, and persistence."""

from typing import Dict, Any, Tuple
from models.schemas import IngestEventRequest, EventDocument, SourceConfidence
from repositories.event_repository import EventRepository
from repositories.session_repository import SessionRepository
from security.redaction import redact_secrets
from datetime import datetime, timezone
import logging

logger = logging.getLogger("services.event_ingestion")


class EventIngestionService:
    """Coordinates event ingestion pipeline."""

    def __init__(self, event_repo: EventRepository = None, session_repo: SessionRepository = None):
        self.event_repo = event_repo if event_repo is not None else EventRepository()
        self.session_repo = session_repo if session_repo is not None else SessionRepository()

    def process_and_store_event(self, request: IngestEventRequest) -> Tuple[str, bool]:
        """
        Normalize event, apply recursive redaction, update session state, and persist to MongoDB.
        Returns (document_id, is_duplicate).
        """
        # 1. Recursive Secret Redaction
        sanitized = redact_secrets(request.raw_payload or {})

        # 2. Extract or preserve timestamp
        ts = request.timestamp or datetime.now(timezone.utc)

        # 3. Determine category and summary if not explicitly provided
        cat = request.category.value if request.category else "system"
        if not request.category:
            if "prompt" in request.event_type.lower():
                cat = "prompt"
            elif "tool" in request.event_type.lower():
                cat = "tool"
            elif "interaction" in request.event_type.lower():
                cat = "interaction"
            elif "stop" in request.event_type.lower():
                cat = "execution"
            elif "error" in request.event_type.lower():
                cat = "error"

        summary = request.summary or f"{request.event_type} event recorded from {request.source}"

        # 4. Build Event Document
        event_doc = EventDocument(
            source_event_id=request.source_event_id,
            agent_id=request.agent_id,
            session_id=request.session_id,
            task_id=request.task_id,
            event_type=request.event_type,
            category=cat,
            summary=summary,
            execution_state=request.execution_state.value if request.execution_state else None,
            correlation_id=request.correlation_id,
            timestamp=ts,
            source=request.source,
            source_confidence=request.source_confidence.value,
            sanitized_payload=sanitized,
        )

        # 5. Insert into MongoDB with deduplication
        doc_id, is_dup = self.event_repo.insert_event(event_doc)

        # 6. Upsert parent session and agent if not duplicate
        if not is_dup:
            self.session_repo.upsert_session(
                session_id=request.session_id,
                agent_id=request.agent_id,
            )
            self.session_repo.upsert_agent(agent_id=request.agent_id)

        return doc_id, is_dup
