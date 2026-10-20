"""Interaction repository for MongoDB dynamic requests and responses."""

from typing import List, Optional, Dict, Any, Tuple
from pymongo.collection import Collection
from pymongo.errors import DuplicateKeyError
from config.database import get_database
from models.schemas import InteractionDocument, InteractionStatus
from datetime import datetime, timezone
import logging

logger = logging.getLogger("repositories.interaction")


class InteractionRepository:
    """Manages persistence and status transitions for dynamic agent interactions."""

    def __init__(self, db=None):
        self._db = db if db is not None else get_database()
        self.collection: Collection = self._db.interactions

    def create_interaction(self, doc: InteractionDocument) -> Tuple[Optional[str], bool]:
        """
        Store a pending interaction request.
        Returns (document_id, is_duplicate).
        """
        data = doc.model_dump(by_alias=True, exclude_none=True)
        if "_id" in data and data["_id"] is None:
            del data["_id"]

        try:
            res = self.collection.insert_one(data)
            return str(res.inserted_id), False
        except DuplicateKeyError:
            logger.info("Interaction already exists: %s", doc.interaction_id)
            existing = self.collection.find_one({"interaction_id": doc.interaction_id})
            return str(existing["_id"]) if existing else None, True

    def get_interaction(self, interaction_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve single interaction by ID."""
        doc = self.collection.find_one({"interaction_id": interaction_id})
        if doc and "_id" in doc:
            doc["_id"] = str(doc["_id"])
        return doc

    def list_pending_interactions(self, session_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """List active pending interactions for dashboard rendering."""
        query = {"status": InteractionStatus.PENDING.value}
        if session_id:
            query["session_id"] = session_id

        cursor = self.collection.find(query).sort("created_at", -1)
        results = []
        for item in cursor:
            item["_id"] = str(item["_id"])
            results.append(item)
        return results

    def resolve_interaction(
        self,
        interaction_id: str,
        response: Dict[str, Any],
        status: InteractionStatus = InteractionStatus.SUBMITTED
    ) -> Optional[Dict[str, Any]]:
        """Atomically transition interaction status and save submitted response."""
        now = datetime.now(timezone.utc)
        doc = self.collection.find_one_and_update(
            {"interaction_id": interaction_id, "status": InteractionStatus.PENDING.value},
            {
                "$set": {
                    "status": status.value,
                    "submitted_response": response,
                    "resolved_at": now,
                }
            },
            return_document=True
        )
        if doc and "_id" in doc:
            doc["_id"] = str(doc["_id"])
        return doc
