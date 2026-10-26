"""Event repository for MongoDB persistence and queries."""

from typing import List, Optional, Dict, Any, Tuple
from pymongo.collection import Collection
from pymongo.errors import DuplicateKeyError, PyMongoError
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
        self._fallback_events: List[Dict[str, Any]] = []

    def insert_event(self, event: EventDocument) -> Tuple[Optional[str], bool]:
        """
        Insert a validated event document into MongoDB.
        Returns (document_id, is_duplicate).
        Handles duplicate source_event_id gracefully via unique compound index.
        Falls back to in-memory event buffer if MongoDB is unavailable.
        """
        doc = event.model_dump(by_alias=True, exclude_none=True)
        if "_id" in doc and doc["_id"] is None:
            del doc["_id"]

        try:
            result = self.collection.insert_one(doc)
            return str(result.inserted_id), False
        except DuplicateKeyError:
            logger.info("Duplicate event ignored for source_event_id: %s", event.source_event_id)
            try:
                existing = self.collection.find_one({"source_event_id": event.source_event_id})
                existing_id = str(existing["_id"]) if existing else None
            except Exception:
                existing_id = None
            return existing_id, True
        except (PyMongoError, Exception) as exc:
            logger.warning(
                "MongoDB unavailable during event insertion (%s). Using in-memory fallback.",
                str(exc),
            )
            # Check duplicate in fallback
            for item in self._fallback_events:
                if item.get("source_event_id") == event.source_event_id:
                    return str(item.get("_id")), True
            doc["_id"] = f"mem-evt-{len(self._fallback_events) + 1}"
            self._fallback_events.insert(0, doc)
            return doc["_id"], False

    def get_events(
        self,
        session_id: Optional[str] = None,
        event_type: Optional[str] = None,
        category: Optional[str] = None,
        search: Optional[str] = None,
        correlation_id: Optional[str] = None,
        limit: int = 50,
        skip: int = 0,
    ) -> List[Dict[str, Any]]:
        """Retrieve paginated events ordered chronologically descending."""
        query: Dict[str, Any] = {}
        if session_id:
            query["session_id"] = session_id
        if event_type:
            query["event_type"] = event_type
        if category:
            query["category"] = category
        if correlation_id:
            query["correlation_id"] = correlation_id
        if search:
            query["$or"] = [
                {"summary": {"$regex": search, "$options": "i"}},
                {"event_type": {"$regex": search, "$options": "i"}},
            ]

        try:
            cursor = (
                self.collection.find(query)
                .sort([("timestamp", -1), ("_id", -1)])
                .skip(skip)
                .limit(limit)
            )
            events = []
            for doc in cursor:
                doc["_id"] = str(doc["_id"])
                events.append(doc)
            return events
        except (PyMongoError, Exception) as exc:
            logger.warning(
                "MongoDB unavailable during get_events (%s). Returning in-memory events.", str(exc)
            )
            filtered = self._fallback_events
            if session_id:
                filtered = [e for e in filtered if e.get("session_id") == session_id]
            if event_type:
                filtered = [e for e in filtered if e.get("event_type") == event_type]
            if category:
                filtered = [e for e in filtered if e.get("category") == category]
            if correlation_id:
                filtered = [e for e in filtered if e.get("correlation_id") == correlation_id]
            if search:
                s_lower = search.lower()
                filtered = [
                    e
                    for e in filtered
                    if s_lower in (e.get("summary") or "").lower()
                    or s_lower in (e.get("event_type") or "").lower()
                ]
            return filtered[skip : skip + limit]

    def count_events(
        self,
        session_id: Optional[str] = None,
        event_type: Optional[str] = None,
        category: Optional[str] = None,
        search: Optional[str] = None,
    ) -> int:
        """Count total events matching filter."""
        query: Dict[str, Any] = {}
        if session_id:
            query["session_id"] = session_id
        if event_type:
            query["event_type"] = event_type
        if category:
            query["category"] = category
        if search:
            query["$or"] = [
                {"summary": {"$regex": search, "$options": "i"}},
                {"event_type": {"$regex": search, "$options": "i"}},
            ]
        try:
            return self.collection.count_documents(query)
        except (PyMongoError, Exception):
            return len(
                self.get_events(
                    session_id=session_id,
                    event_type=event_type,
                    category=category,
                    search=search,
                    limit=10000,
                )
            )
