"""Git Workspace Review and Diff Inspection Route."""

import subprocess
from pathlib import Path
from fastapi import APIRouter

router = APIRouter(tags=["Git Review"])


@router.get("/api/v1/git/review")
def get_git_review():
    """Return workspace modified files and git diff for the Review Changes control."""
    workspace_root = Path(__file__).resolve().parent.parent.parent

    try:
        # Check current working tree status
        status_proc = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=str(workspace_root),
            capture_output=True,
            text=True,
            timeout=3.0
        )
        status_output = status_proc.stdout.strip()

        # If working tree is clean, get diff against latest commit
        diff_cmd = ["git", "diff", "HEAD~1"] if not status_output else ["git", "diff"]
        diff_proc = subprocess.run(
            diff_cmd,
            cwd=str(workspace_root),
            capture_output=True,
            text=True,
            timeout=3.0
        )

        stat_proc = subprocess.run(
            ["git", "diff", "--stat", "HEAD~1" if not status_output else "HEAD"],
            cwd=str(workspace_root),
            capture_output=True,
            text=True,
            timeout=3.0
        )

        files = []
        for line in status_output.splitlines():
            line = line.strip()
            if line:
                parts = line.split(maxsplit=1)
                if len(parts) == 2:
                    files.append({"status": parts[0], "file": parts[1]})

        return {
            "has_changes": bool(status_output) or bool(diff_proc.stdout.strip()),
            "files": files,
            "stat": stat_proc.stdout.strip(),
            "diff": diff_proc.stdout[:8000] if diff_proc.stdout else "No unstaged changes.",
        }
    except Exception as exc:
        return {
            "has_changes": False,
            "files": [],
            "stat": "",
            "diff": f"Git review unavailable: {str(exc)}"
        }
