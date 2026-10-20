"""MongoDB client and database lifecycle management for CloudWatchV2."""

from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import PyMongoError, ServerSelectionTimeoutError
from config.settings import settings
from typing import Optional
import logging

logger = logging.getLogger("database")

_mongo_client: Optional[MongoClient] = None


def get_mongo_client() -> MongoClient:
    """Get or create singleton MongoClient with bounded timeouts."""
    global _mongo_client
    if _mongo_client is None:
        logger.info("Initializing MongoClient connecting to %s", settings.mongodb_uri)
        _mongo_client = MongoClient(
            settings.mongodb_uri,
            connectTimeoutMS=settings.mongodb_connect_timeout_ms,
            serverSelectionTimeoutMS=settings.mongodb_server_selection_timeout_ms,
            uuidRepresentation="standard",
        )
    return _mongo_client


def get_database(db_name: Optional[str] = None):
    """Retrieve application MongoDB database handle."""
    client = get_mongo_client()
    return client[db_name or settings.mongodb_database]


def close_mongo_client():
    """Cleanly close MongoDB client connection pool."""
    global _mongo_client
    if _mongo_client is not None:
        logger.info("Closing MongoClient connection pool")
        _mongo_client.close()
        _mongo_client = None


def check_mongo_connection() -> dict:
    """Perform bounded ping command against MongoDB to check readiness."""
    try:
        client = get_mongo_client()
        client.admin.command("ping")
        server_info = client.server_info()
        return {
            "status": "connected",
            "version": server_info.get("version", "unknown"),
            "database": settings.mongodb_database,
            "error": None,
        }
    except ServerSelectionTimeoutError as e:
        logger.warning("MongoDB ping timeout: %s", str(e))
        return {
            "status": "disconnected",
            "version": None,
            "database": settings.mongodb_database,
            "error": "MongoDB server connection timed out",
        }
    except Exception as e:
        logger.error("MongoDB ping error: %s", str(e))
        return {
            "status": "error",
            "version": None,
            "database": settings.mongodb_database,
            "error": str(e),
        }


def init_db_indexes(db=None):
    """Ensure all required indexes exist with explicit rationale and constraints."""
    database = db if db is not None else get_database()
    
    # Events collection
    # 1. Deterministic deduplication index
    database.events.create_index(
        [("source_event_id", ASCENDING)],
        unique=True,
        name="uniq_source_event_id",
        sparse=True,
    )
    # 2. Chronological timeline ordering
    database.events.create_index(
        [("timestamp", DESCENDING), ("_id", DESCENDING)],
        name="idx_events_timeline",
    )
    # 3. Session-filtered timeline
    database.events.create_index(
        [("session_id", ASCENDING), ("timestamp", DESCENDING)],
        name="idx_events_session_timeline",
    )
    # 4. Event type filtering
    database.events.create_index(
        [("event_type", ASCENDING), ("timestamp", DESCENDING)],
        name="idx_events_type_timeline",
    )

    # Sessions collection
    database.sessions.create_index(
        [("session_id", ASCENDING)],
        unique=True,
        name="uniq_session_id",
    )
    database.sessions.create_index(
        [("updated_at", DESCENDING)],
        name="idx_sessions_updated_at",
    )

    # Agents collection
    database.agents.create_index(
        [("agent_id", ASCENDING)],
        unique=True,
        name="uniq_agent_id",
    )

    # Tasks collection
    database.tasks.create_index(
        [("task_id", ASCENDING)],
        unique=True,
        name="uniq_task_id",
    )
    database.tasks.create_index(
        [("session_id", ASCENDING), ("updated_at", DESCENDING)],
        name="idx_tasks_session",
    )

    # Interactions collection
    database.interactions.create_index(
        [("interaction_id", ASCENDING)],
        unique=True,
        name="uniq_interaction_id",
    )
    database.interactions.create_index(
        [("status", ASCENDING), ("created_at", DESCENDING)],
        name="idx_interactions_status_time",
    )
    database.interactions.create_index(
        [("session_id", ASCENDING), ("status", ASCENDING)],
        name="idx_interactions_session_status",
    )

    logger.info("MongoDB indexes verified on database '%s'", database.name)
