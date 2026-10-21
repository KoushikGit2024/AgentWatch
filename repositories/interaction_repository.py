"""Interaction repository for MongoDB dynamic requests and responses."""

from typing import List, Optional, Dict, Any, Tuple
from pymongo.collection import Collection
from pymongo.errors import DuplicateKeyError, PyMongoError
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
        self._fallback_store: Dict[str, Dict[str, Any]] = {}

    def create_interaction(self, doc: InteractionDocument) -> Tuple[Optional[str], bool]:
        """
        Store a pending interaction request.
        Returns (document_id, is_duplicate).
        Falls back to in-memory store if MongoDB is unavailable.
        """
        data = doc.model_dump(by_alias=True, exclude_none=True)
        if "_id" in data and data["_id"] is None:
            del data["_id"]

        try:
            res = self.collection.insert_one(data)
            return str(res.inserted_id), False
        except DuplicateKeyError:
            logger.info("Interaction already exists: %s", doc.interaction_id)
            try:
                existing = self.collection.find_one({"interaction_id": doc.interaction_id})
                existing_id = str(existing["_id"]) if existing else None
            except Exception:
                existing_id = None
            return existing_id, True
        except (PyMongoError, Exception) as exc:
            logger.warning("MongoDB unavailable during interaction creation (%s). Using fallback.", str(exc))
            if doc.interaction_id in self._fallback_store:
                return doc.interaction_id, True
            data["_id"] = f"mem-int-{doc.interaction_id}"
            self._fallback_store[doc.interaction_id] = data
            return data["_id"], False

    def get_interaction(self, interaction_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve single interaction by ID."""
        try:
            doc = self.collection.find_one({"interaction_id": interaction_id})
            if doc and "_id" in doc:
                doc["_id"] = str(doc["_id"])
            return doc
        except (PyMongoError, Exception) as exc:
            logger.warning("MongoDB unavailable during get_interaction (%s). Checking fallback.", str(exc))
            return self._fallback_store.get(interaction_id)

    def list_pending_interactions(self, session_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """List active pending interactions for dashboard rendering."""
        query = {"status": InteractionStatus.PENDING.value}
        if session_id:
            query["session_id"] = session_id

        try:
            cursor = self.collection.find(query).sort("created_at", -1)
            results = []
            for item in cursor:
                item["_id"] = str(item["_id"])
                results.append(item)
            return results
        except (PyMongoError, Exception) as exc:
            logger.warning("MongoDB unavailable during list_pending_interactions (%s). Checking fallback.", str(exc))
            res = [
                v for v in self._fallback_store.values()
                if v.get("status") == InteractionStatus.PENDING.value
            ]
            if session_id:
                res = [v for v in res if v.get("session_id") == session_id]
            return res

    def resolve_interaction(
        self,
        interaction_id: str,
        response: Dict[str, Any],
        status: InteractionStatus = InteractionStatus.SUBMITTED
    ) -> Optional[Dict[str, Any]]:
        """Atomically transition interaction status and save submitted response."""
        now = datetime.now(timezone.utc)
        if interaction_id in self._fallback_store:
            self._fallback_store[interaction_id]["status"] = status.value
            self._fallback_store[interaction_id]["submitted_response"] = response
            self._fallback_store[interaction_id]["resolved_at"] = now

        try:
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
            return doc or self._fallback_store.get(interaction_id)
        except (PyMongoError, Exception) as exc:
            logger.warning("MongoDB unavailable during resolve_interaction (%s). Updated fallback.", str(exc))
            return self._fallback_store.get(interaction_id)
