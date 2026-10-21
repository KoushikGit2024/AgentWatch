"""Git Workspace Review and Diff Inspection Route."""

import os
import re
import subprocess
from pathlib import Path
from typing import Any, Dict, List
from fastapi import APIRouter

router = APIRouter(tags=["Git Review"])


def _get_untracked_file_diff(workspace_root: Path, rel_path: str) -> Dict[str, Any]:
    """Synthesize a unified diff for an untracked file."""
    full_path = workspace_root / rel_path
    if not full_path.is_file():
        return {"diff": "", "additions": 0, "deletions": 0}

    try:
        # Avoid reading large binary files
        with open(full_path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()

        additions = len(lines)
        deletions = 0
        diff_lines = [
            f"diff --git a/{rel_path} b/{rel_path}",
            "new file mode 100644",
            "--- /dev/null",
            f"+++ b/{rel_path}",
            f"@@ -0,0 +1,{max(1, additions)} @@",
        ]
        # Include first 1000 lines
        for line in lines[:1000]:
            diff_lines.append(f"+{line.rstrip('\r\n')}")

        if len(lines) > 1000:
            diff_lines.append(f"... ({len(lines) - 1000} more lines)")

        return {
            "diff": "\n".join(diff_lines),
            "additions": additions,
            "deletions": deletions,
        }
    except Exception:
        return {"diff": f"Binary or unreadable file: {rel_path}", "additions": 0, "deletions": 0}


def _split_unified_diff_by_file(diff_text: str) -> Dict[str, str]:
    """Split a combined git diff text into per-file diffs keyed by relative path."""
    file_diffs: Dict[str, str] = {}
    current_file = None
    current_lines: List[str] = []

    for line in diff_text.splitlines():
        if line.startswith("diff --git "):
            if current_file and current_lines:
                file_diffs[current_file] = "\n".join(current_lines)
            current_lines = [line]
            # Match b/(path)
            match = re.search(r"b/(.+)$", line)
            current_file = match.group(1).strip() if match else None
        else:
            current_lines.append(line)

    if current_file and current_lines:
        file_diffs[current_file] = "\n".join(current_lines)

    return file_diffs


def _count_diff_lines(diff_content: str) -> Dict[str, int]:
    """Count additions and deletions from a unified diff string."""
    additions = 0
    deletions = 0
    for line in diff_content.splitlines():
        if line.startswith("+") and not line.startswith("+++"):
            additions += 1
        elif line.startswith("-") and not line.startswith("---"):
            deletions += 1
    return {"additions": additions, "deletions": deletions}


@router.get("/api/v1/git/review")
def get_git_review():
    """Return workspace modified files, stats, and granular diffs for Review Changes."""
    workspace_root = Path(__file__).resolve().parent.parent.parent

    try:
        # Check current working tree status (including untracked files)
        status_proc = subprocess.run(
            ["git", "status", "--porcelain", "-uall"],
            cwd=str(workspace_root),
            capture_output=True,
            text=True,
            timeout=4.0
        )
        status_output = status_proc.stdout.strip()

        # If working tree has changes, diff against HEAD (captures staged and unstaged)
        # If clean, diff the most recent commit HEAD~1..HEAD
        diff_cmd = ["git", "diff", "HEAD"] if status_output else ["git", "diff", "HEAD~1", "HEAD"]
        diff_proc = subprocess.run(
            diff_cmd,
            cwd=str(workspace_root),
            capture_output=True,
            text=True,
            timeout=4.0
        )
        git_diff_text = diff_proc.stdout or ""

        stat_cmd = ["git", "diff", "--stat", "HEAD"] if status_output else ["git", "diff", "--stat", "HEAD~1", "HEAD"]
        stat_proc = subprocess.run(
            stat_cmd,
            cwd=str(workspace_root),
            capture_output=True,
            text=True,
            timeout=4.0
        )
        stat_output = stat_proc.stdout.strip()

        # Split tracked git diff by file
        tracked_diffs = _split_unified_diff_by_file(git_diff_text)

        files_list = []
        total_add = 0
        total_del = 0
        all_diff_parts = []

        if status_output:
            for line in status_output.splitlines():
                line = line.strip()
                if not line:
                    continue
                parts = line.split(maxsplit=1)
                if len(parts) != 2:
                    continue

                status_code, rel_path = parts[0], parts[1].strip('"')
                # Normalise path separators
                norm_path = rel_path.replace("\\", "/")

                if status_code == "??":
                    untracked_info = _get_untracked_file_diff(workspace_root, rel_path)
                    file_diff = untracked_info["diff"]
                    add_cnt = untracked_info["additions"]
                    del_cnt = untracked_info["deletions"]
                else:
                    file_diff = tracked_diffs.get(norm_path, "")
                    if not file_diff:
                        # Try matching by filename end
                        for k, v in tracked_diffs.items():
                            if k.endswith(norm_path) or norm_path.endswith(k):
                                file_diff = v
                                break
                    counts = _count_diff_lines(file_diff)
                    add_cnt = counts["additions"]
                    del_cnt = counts["deletions"]

                total_add += add_cnt
                total_del += del_cnt

                files_list.append({
                    "file": norm_path,
                    "status": status_code,
                    "additions": add_cnt,
                    "deletions": del_cnt,
                    "diff": file_diff[:12000] if file_diff else None
                })

                if file_diff:
                    all_diff_parts.append(file_diff)

            combined_diff = "\n\n".join(all_diff_parts) if all_diff_parts else git_diff_text
        else:
            # Working tree is clean: show files from latest commit diff
            for fpath, fdiff in tracked_diffs.items():
                counts = _count_diff_lines(fdiff)
                total_add += counts["additions"]
                total_del += counts["deletions"]
                files_list.append({
                    "file": fpath,
                    "status": "C",  # Committed
                    "additions": counts["additions"],
                    "deletions": counts["deletions"],
                    "diff": fdiff[:12000]
                })
            combined_diff = git_diff_text

        has_changes = bool(status_output) or bool(git_diff_text.strip())

        return {
            "has_changes": has_changes,
            "is_clean_working_tree": not bool(status_output),
            "summary": {
                "total_files": len(files_list),
                "total_additions": total_add,
                "total_deletions": total_del,
            },
            "files": files_list,
            "stat": stat_output or (f"{len(files_list)} file(s) changed, +{total_add}, -{total_del}" if files_list else "Clean"),
            "diff": combined_diff[:25000] if combined_diff else "No changes detected."
        }

    except Exception as exc:
        return {
            "has_changes": False,
            "is_clean_working_tree": True,
            "summary": {"total_files": 0, "total_additions": 0, "total_deletions": 0},
            "files": [],
            "stat": "",
            "diff": f"Git review unavailable: {str(exc)}"
        }
