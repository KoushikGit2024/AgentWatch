"""High-precision diff computation utility for file modification tool calls with LRU caching."""

import difflib
import hashlib
import json
import os
import re
from functools import lru_cache
from typing import Any, Dict, List, Optional, Tuple


@lru_cache(maxsize=256)
def _cached_unified_diff(
    old_text: str, new_text: str, filename: str = "", start_line: int = 1
) -> Dict[str, Any]:
    """Cached internal computation of additions, deletions, and unified patch."""
    old_lines = (old_text or "").splitlines(keepends=True)
    new_lines = (new_text or "").splitlines(keepends=True)

    old_stripped = [line.rstrip("\r\n") for line in old_lines]
    new_stripped = [line.rstrip("\r\n") for line in new_lines]

    matcher = difflib.SequenceMatcher(None, old_stripped, new_stripped)
    added_count = 0
    removed_count = 0

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag in ("replace", "delete"):
            removed_count += i2 - i1
        if tag in ("replace", "insert"):
            added_count += j2 - j1

    unified = list(
        difflib.unified_diff(
            old_lines,
            new_lines,
            fromfile=f"a/{filename}" if filename else "a",
            tofile=f"b/{filename}" if filename else "b",
            n=2,
        )
    )

    diff_text = "".join(unified)
    if not diff_text and (old_text != new_text):
        diff_text = f"--- a/{filename}\n+++ b/{filename}\n"
        for line in old_stripped:
            diff_text += f"-{line}\n"
        for line in new_stripped:
            diff_text += f"+{line}\n"

    return {
        "added_count": added_count,
        "removed_count": removed_count,
        "diff_text": diff_text[:6000] if diff_text else None,
        "start_line": start_line,
        "is_net_change": (added_count > 0 or removed_count > 0),
    }


def compute_unified_diff(
    old_text: str, new_text: str, filename: str = "", start_line: int = 1
) -> Dict[str, Any]:
    """
    Compute precise additions, deletions, and unified patch with line context.
    Uses LRU cache to avoid recomputing SequenceMatcher on identical edits.
    """
    res = _cached_unified_diff(old_text or "", new_text or "", filename or "", start_line or 1)
    return dict(res)


def format_lines_badge(added: int, removed: int) -> str:
    """Format concise and accurate line changes badge like '+3 lines', '-2 lines', or '-1 +4 lines'."""
    if added > 0 and removed > 0:
        return f"-{removed} +{added} lines"
    elif added > 0:
        return f"+{added} line" if added == 1 else f"+{added} lines"
    elif removed > 0:
        return f"-{removed} line" if removed == 1 else f"-{removed} lines"
    return "0 lines"


# Cache parsed tool diffs by deterministic signature so historical turns never re-read disk or re-run difflib
_TOOL_DIFF_CACHE: Dict[str, Tuple[str, Optional[str], Optional[Dict[str, Any]]]] = {}


def parse_edit_tool_diff(
    tool_name: str, args: Dict[str, Any], workspace_root: Optional[str] = None
) -> Tuple[str, Optional[str], Optional[Dict[str, Any]]]:
    """
    Parse write_to_file, replace_file_content, or multi_replace_file_content
    into target string, delta badge extra (e.g. '-3 +5 lines'), and compact diff_info payload.
    """
    file_target = args.get("TargetFile") or ""
    file_parts = re.split(r"[\\/]", file_target)
    file_short = file_parts[-1] if file_parts else file_target

    # Build fast cache key from tool_name and args
    try:
        sig_raw = f"{tool_name}:{file_target}:{json.dumps(args, sort_keys=True, default=str)}"
        cache_key = hashlib.md5(sig_raw.encode("utf-8", errors="ignore")).hexdigest()
        if cache_key in _TOOL_DIFF_CACHE:
            return _TOOL_DIFF_CACHE[cache_key]
    except Exception:
        cache_key = None

    result: Tuple[str, Optional[str], Optional[Dict[str, Any]]] = (file_short, None, None)

    if tool_name == "multi_replace_file_content":
        raw_chunks = args.get("ReplacementChunks") or []
        if isinstance(raw_chunks, str):
            try:
                chunks = json.loads(raw_chunks)
            except Exception:
                chunks = []
        elif isinstance(raw_chunks, list):
            chunks = raw_chunks
        else:
            chunks = []

        total_added = 0
        total_removed = 0
        diff_chunks = []
        min_start = None
        max_end = None

        for chunk in chunks:
            if not isinstance(chunk, dict):
                continue
            tc = chunk.get("TargetContent") or ""
            rc = chunk.get("ReplacementContent") or ""
            sl = chunk.get("StartLine") or 1
            el = chunk.get("EndLine") or sl

            if min_start is None or sl < min_start:
                min_start = sl
            if max_end is None or el > max_end:
                max_end = el

            c_diff = compute_unified_diff(tc, rc, filename=file_short, start_line=sl)
            total_added += c_diff["added_count"]
            total_removed += c_diff["removed_count"]
            if c_diff["diff_text"]:
                diff_chunks.append(c_diff["diff_text"])

        combined_diff = "\n".join(diff_chunks)
        chunk_count = len(chunks)
        target = f"{file_short} ({chunk_count} chunk{'s' if chunk_count != 1 else ''})"
        if min_start and max_end:
            target = f"{file_short} #L{min_start}-{max_end}"

        extra = format_lines_badge(total_added, total_removed)
        diff_info = {
            "file": file_short,
            "target_file": file_target,
            "diff_text": combined_diff[:6000] if combined_diff else None,
            "added_count": total_added,
            "removed_count": total_removed,
            "chunk_count": chunk_count,
            "start_line": min_start,
            "end_line": max_end,
        }
        result = (target, extra, diff_info)

    elif tool_name == "replace_file_content":
        tc = args.get("TargetContent") or ""
        rc = args.get("ReplacementContent") or ""
        start_l = args.get("StartLine")
        end_l = args.get("EndLine")

        if start_l and end_l:
            target = f"{file_short} #L{start_l}-{end_l}"
        elif start_l:
            target = f"{file_short} #L{start_l}"
        else:
            target = file_short

        res = compute_unified_diff(tc, rc, filename=file_short, start_line=start_l or 1)
        added = res["added_count"]
        removed = res["removed_count"]
        extra = format_lines_badge(added, removed)

        diff_info = {
            "file": file_short,
            "target_file": file_target,
            "diff_text": res["diff_text"],
            "added_count": added,
            "removed_count": removed,
            "start_line": start_l,
            "end_line": end_l,
        }
        result = (target, extra, diff_info)

    elif tool_name == "write_to_file":
        code_content = args.get("CodeContent") or ""
        line_cnt = len(code_content.splitlines())
        added = line_cnt
        removed = 0
        extra = format_lines_badge(added, 0)
        # Synthesize compact creation/write diff without blocking on 200KB disk reads on every poll
        preview_lines = code_content.splitlines()[:120]
        diff_text = f"--- /dev/null\n+++ b/{file_short}\n@@ -0,0 +1,{max(1, line_cnt)} @@\n"
        diff_text += "\n".join(f"+{line}" for line in preview_lines) + "\n"

        target = file_short
        diff_info = {
            "file": file_short,
            "target_file": file_target,
            "diff_text": diff_text[:6000] if diff_text else None,
            "added_count": added,
            "removed_count": removed,
            "is_new_file": not bool(args.get("Overwrite", False)),
        }
        result = (target, extra, diff_info)

    if cache_key:
        if len(_TOOL_DIFF_CACHE) > 512:
            _TOOL_DIFF_CACHE.clear()
        _TOOL_DIFF_CACHE[cache_key] = result

    return result
