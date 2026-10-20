"""Event repository for MongoDB persistence and queries."""

from typing import List, Optional, Dict, Any, Tuple
from pymongo.collection import Collection
from pymongo.errors import DuplicateKeyError
from config.database import get_database
from models.schemas import EventDocument
from datetime import datetime, timezone
import logging

logger = logging.getLogger("repositories.event")


class EventRepository:
    """Manages event persistence, deduplication, and timeline querying."""

    def __init__(self, db=None):
        self._db = db if db is not None else get_database()
        self.collection: Collection = self._db.events

    def insert_event(self, event: EventDocument) -> Tuple[Optional[str], bool]:
        """
        Insert a validated event document into MongoDB.
        Returns (document_id, is_duplicate).
        Handles duplicate source_event_id gracefully via unique compound index.
        """
        doc = event.model_dump(by_alias=True, exclude_none=True)
        if "_id" in doc and doc["_id"] is None:
            del doc["_id"]

        try:
            result = self.collection.insert_one(doc)
            return str(result.inserted_id), False
        except DuplicateKeyError:
            logger.info("Duplicate event ignored for source_event_id: %s", event.source_event_id)
            existing = self.collection.find_one({"source_event_id": event.source_event_id})
            existing_id = str(existing["_id"]) if existing else None
            return existing_id, True

    def get_events(
        self,
        session_id: Optional[str] = None,
        event_type: Optional[str] = None,
        limit: int = 50,
        skip: int = 0
    ) -> List[Dict[str, Any]]:
        """Retrieve paginated events ordered chronologically descending."""
        query: Dict[str, Any] = {}
        if session_id:
            query["session_id"] = session_id
        if event_type:
            query["event_type"] = event_type

        cursor = self.collection.find(query).sort([("timestamp", -1), ("_id", -1)]).skip(skip).limit(limit)
        events = []
        for doc in cursor:
            doc["_id"] = str(doc["_id"])
            events.append(doc)
        return events

    def count_events(self, session_id: Optional[str] = None) -> int:
        """Count total events matching filter."""
        query = {"session_id": session_id} if session_id else {}
        return self.collection.count_documents(query)
