"""Session and Agent repository for MongoDB persistence and queries."""

from typing import List, Optional, Dict, Any
from pymongo.collection import Collection
from pymongo.errors import PyMongoError
from config.database import get_database
from models.schemas import SessionDocument, AgentDocument
from datetime import datetime, timezone
import logging

logger = logging.getLogger("repositories.session")


class SessionRepository:
    """Manages session metadata and status in MongoDB with in-memory fallbacks."""

    def __init__(self, db=None):
        self._db = db if db is not None else get_database()
        self.sessions: Collection = self._db.sessions
        self.agents: Collection = self._db.agents
        self._fallback_sessions: Dict[str, Dict[str, Any]] = {}
        self._fallback_agents: Dict[str, Dict[str, Any]] = {}

    def upsert_session(
        self,
        session_id: str,
        agent_id: str,
        title: Optional[str] = None,
        status: Optional[str] = None,
        mode: Optional[str] = None,
        model: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Upsert session tracking document."""
        now = datetime.now(timezone.utc)
        update_fields: Dict[str, Any] = {
            "agent_id": agent_id,
            "updated_at": now,
        }
        if title:
            update_fields["title"] = title
        if status:
            update_fields["status"] = status
        if mode:
            update_fields["current_mode"] = mode
        if model:
            update_fields["current_model"] = model

        # Update fallback
        if session_id not in self._fallback_sessions:
            self._fallback_sessions[session_id] = {"session_id": session_id, "created_at": now}
        self._fallback_sessions[session_id].update(update_fields)

        try:
            doc = self.sessions.find_one_and_update(
                {"session_id": session_id},
                {
                    "$set": update_fields,
                    "$setOnInsert": {
                        "session_id": session_id,
                        "created_at": now,
                    },
                },
                upsert=True,
                return_document=True,
            )
            if doc and "_id" in doc:
                doc["_id"] = str(doc["_id"])
            return doc or self._fallback_sessions[session_id]
        except (PyMongoError, Exception) as exc:
            logger.warning(
                "MongoDB unavailable during session upsert (%s). Used fallback.", str(exc)
            )
            return self._fallback_sessions[session_id]

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve single session document."""
        try:
            doc = self.sessions.find_one({"session_id": session_id})
            if doc and "_id" in doc:
                doc["_id"] = str(doc["_id"])
            return doc
        except (PyMongoError, Exception) as exc:
            logger.warning("MongoDB unavailable during get_session (%s).", str(exc))
            return self._fallback_sessions.get(session_id)

    def list_sessions(self, limit: int = 50) -> List[Dict[str, Any]]:
        """List recent sessions ordered by updated_at descending."""
        try:
            cursor = self.sessions.find({}).sort("updated_at", -1).limit(limit)
            results = []
            for doc in cursor:
                doc["_id"] = str(doc["_id"])
                results.append(doc)
            return results
        except (PyMongoError, Exception) as exc:
            logger.warning("MongoDB unavailable during list_sessions (%s).", str(exc))
            return list(self._fallback_sessions.values())[:limit]

    def upsert_agent(self, agent_id: str, name: Optional[str] = None) -> Dict[str, Any]:
        """Upsert agent entry."""
        now = datetime.now(timezone.utc)
        update_fields: Dict[str, Any] = {"agent_id": agent_id, "last_seen": now}
        if name:
            update_fields["name"] = name

        self._fallback_agents[agent_id] = {
            **self._fallback_agents.get(agent_id, {}),
            **update_fields,
        }

        try:
            doc = self.agents.find_one_and_update(
                {"agent_id": agent_id},
                {
                    "$set": update_fields,
                    "$setOnInsert": {
                        "agent_id": agent_id,
                        "name": name or "Antigravity Agent",
                        "capabilities": ["observe", "status"],
                    },
                },
                upsert=True,
                return_document=True,
            )
            if doc and "_id" in doc:
                doc["_id"] = str(doc["_id"])
            return doc or self._fallback_agents[agent_id]
        except (PyMongoError, Exception) as exc:
            logger.warning("MongoDB unavailable during agent upsert (%s).", str(exc))
            return self._fallback_agents[agent_id]
