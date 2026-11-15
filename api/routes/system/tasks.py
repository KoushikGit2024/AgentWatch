"""API routes for monitoring IDE background tasks."""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from services.monitoring.task_monitor_service import task_monitor_service

router = APIRouter(prefix="/api/v1/tasks", tags=["Background Tasks"])


@router.get("")
def list_tasks(
    limit: int = Query(20, ge=1, le=100),
    active_only: bool = Query(True, description="Return live active background tasks verified via SQLite and OS processes"),
    conversation_id: Optional[str] = Query(None, description="Optional target conversation ID"),
):
    """List background tasks detected in the active brain session."""
    tasks = task_monitor_service.list_tasks(
        limit=limit, active_only=active_only, conversation_id=conversation_id
    )
    return {"tasks": tasks, "total": len(tasks)}


@router.get("/{task_id}")
def get_task_details(task_id: str, tail_bytes: int = Query(50_000, ge=100, le=500_000)):
    """Fetch recent execution log output for a given background task."""
    details = task_monitor_service.get_task_log(task_id, tail_bytes=tail_bytes)
    if not details:
        raise HTTPException(status_code=404, detail=f"Task {task_id} log not found")
    return details


@router.post("/kill")
@router.post("/{pid}/kill")
def kill_task_process(pid: int):
    """Safely terminate a background task process and its subprocess tree by OS PID."""
    result = task_monitor_service.kill_task_process(pid)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to kill process"))
    return result

