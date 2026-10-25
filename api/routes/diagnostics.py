"""Operational Diagnostics Route."""

from fastapi import APIRouter
from integrations.antigravity.adapter import antigravity_adapter

router = APIRouter(tags=["Diagnostics"])


@router.get("/api/v1/diagnostics")
def get_operational_diagnostics():
    """
    Comprehensive operational diagnostics reporting independently verified
    health of FastAPI, MongoDB readiness, Antigravity CDP, and unresolved operations.
    Sanitizes private local paths and internal secrets.
    """
    from config.database import check_mongo_connection, get_database
    from repositories.event_repository import EventRepository
    from repositories.interaction_repository import InteractionRepository

    # 1. MongoDB Bounded Readiness Check
    mongo_status = check_mongo_connection()
    db_ready = mongo_status.get("status") == "connected"

    # 2. Antigravity CDP Target Status
    ag_status = antigravity_adapter.get_status()
    cdp_connected = ag_status.get("cdp", {}).get("connected", False)

    # 3. Unresolved and in-progress counts
    db = get_database()
    pending_interactions = InteractionRepository().list_pending_interactions()
    in_progress_count = db.idempotency_keys.count_documents({"status": "in_progress"})
    outcome_unknown_count = db.idempotency_keys.count_documents({"status": "outcome_unknown"})

    # 4. Last event ingestion
    last_event = EventRepository().get_events(limit=1)
    last_event_time = last_event[0].get("timestamp") if last_event else None

    return {
        "fastapi_live": True,
        "mongodb_ready": db_ready,
        "mongodb_database": mongo_status.get("database", "AgentWatch_v2"),
        "mongodb_version": mongo_status.get("version"),
        "cdp_connected": cdp_connected,
        "cdp_port": ag_status.get("cdp", {}).get("port"),
        "cdp_target": ag_status.get("cdp", {}).get("title"),
        "last_successful_observation": ag_status.get("last_successful_observation"),
        "last_successful_connection": ag_status.get("last_successful_connection"),
        "last_event_ingestion": last_event_time,
        "pending_interactions_count": len(pending_interactions),
        "in_progress_operations_count": in_progress_count,
        "outcome_unknown_count": outcome_unknown_count,
        "reconnection_attempts": ag_status.get("reconnect_attempts", 0),
        "last_error": ag_status.get("last_error"),
    }


@router.get("/api/v1/system/processes")
def get_system_processes(sort_by: str = "memory", limit: int = 15):
    """
    Return host system task manager statistics and top CPU/Memory consumers.
    Supports sort_by='memory' or 'cpu' with configurable item limit (10-30).
    """
    from services.system_metrics_service import system_metrics_service

    bounded_limit = max(5, min(int(limit), 35))
    clean_sort = "cpu" if sort_by.lower() == "cpu" else "memory"
    return system_metrics_service.get_task_manager_snapshot(sort_by=clean_sort, limit=bounded_limit)
