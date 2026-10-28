"""API routes for monitoring Antigravity background tasks."""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from services.task_monitor_service import task_monitor_service

router = APIRouter(prefix="/api/v1/tasks", tags=["Background Tasks"])


@router.get("")
def list_tasks(limit: int = Query(20, ge=1, le=100)):
    """List recent background tasks detected in the active brain session."""
    tasks = task_monitor_service.list_tasks(limit=limit)
    return {"tasks": tasks, "total": len(tasks)}


@router.get("/{task_id}")
def get_task_details(task_id: str, tail_bytes: int = Query(50_000, ge=100, le=500_000)):
    """Fetch recent execution log output for a given background task."""
    details = task_monitor_service.get_task_log(task_id, tail_bytes=tail_bytes)
    if not details:
        raise HTTPException(status_code=404, detail=f"Task {task_id} log not found")
    return details

