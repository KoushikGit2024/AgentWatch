"""FastAPI Router for Git DAG Graph and Commit Inspection.

Adheres strictly to AGENTS.md (< 500 LOC limit).
"""

from pathlib import Path
from typing import Any, Dict
from fastapi import APIRouter, HTTPException, Query

from services.git_graph_service import get_commit_diff, get_git_graph
from services.workspace.workspace_context import workspace_context

router = APIRouter(prefix="/api/v1/git", tags=["Git Graph"])


def _resolve_workspace() -> Path:
    """Resolve current active workspace root."""
    root = workspace_context.get_active_workspace_path()
    if not root or not root.exists():
        root = Path(__file__).resolve().parent.parent.parent.parent
    return root


@router.get("/graph")
async def git_graph_endpoint(
    limit: int = Query(default=75, ge=1, le=50000, description="Max commits to fetch")
) -> Dict[str, Any]:
    """Retrieve topological commit graph with deterministic DAG lanes."""
    workspace_root = _resolve_workspace()
    try:
        return await get_git_graph(workspace_root=workspace_root, limit=limit)
    except Exception as exc:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to generate git graph: {type(exc).__name__}: {str(exc) or repr(exc)}"
        )


@router.get("/commit/{sha}")
async def git_commit_diff_endpoint(sha: str) -> Dict[str, Any]:
    """Retrieve commit diff, stats, and metadata for a specific commit SHA."""
    # Basic sanitize check on SHA
    clean_sha = sha.strip()
    if not clean_sha.isalnum() or len(clean_sha) > 40:
        raise HTTPException(status_code=400, detail="Invalid commit SHA format")

    workspace_root = _resolve_workspace()
    try:
        res = await get_commit_diff(workspace_root=workspace_root, sha=clean_sha)
        if "error" in res:
            raise HTTPException(status_code=404, detail=res["error"])
        return res
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Failed to read commit diff: {str(exc)}"
        )
