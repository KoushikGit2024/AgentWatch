"""Service to read, cache, and paginate the live Antigravity IDE conversation transcript."""

import hashlib
import json
import logging
import re
import time
from pathlib import Path
from typing import List, Dict, Any, Optional

from services.transcript_parser import TranscriptStepParser
from services.step_resolver import step_output_resolver

logger = logging.getLogger(__name__)


class ConversationService:
    """
    Extracts genuine Antigravity chat turns directly from local IDE transcripts.
    Includes in-memory turn caching keyed on file (path, mtime, size) and
    cursor-based upward pagination (before=<turn_index>, limit=<count>).
    """

    def __init__(self):
        self.brain_bases = [
            Path.home() / ".gemini" / "antigravity" / "brain",
            Path.home() / ".gemini" / "antigravity-ide" / "brain",
        ]
        self.brain_base = self.brain_bases[0]
        self._stopped_active: bool = False
        self._resolved_approvals: Dict[str, str] = {}
        self._latest_pending_approval: Optional[Dict[str, Any]] = None
        self._cached_key: Optional[tuple] = None
        self._cached_turns: List[Dict[str, Any]] = []

    def mark_active_turn_stopped(self):
        """Signal that the user requested emergency stop so the UI immediately reflects it."""
        self._stopped_active = True
        self._cached_key = None

    def mark_approval_resolved(
        self, step_id: Optional[str], decision: str, target: Optional[str] = None
    ):
        """Record that a pending approval step was answered so it does not re-trigger."""
        if step_id:
            self._resolved_approvals[step_id] = decision
        if target:
            target_hash = hashlib.md5(target.encode("utf-8", errors="ignore")).hexdigest()[:8]
            self._resolved_approvals[f"cmd-{target_hash}"] = decision
        if self._latest_pending_approval:
            if (
                not step_id
                or self._latest_pending_approval.get("step_id") == step_id
                or self._latest_pending_approval.get("target") == target
            ):
                self._latest_pending_approval = None
        self._cached_key = None

    def get_pending_approval(self) -> Optional[Dict[str, Any]]:
        """Return currently active command/tool approval extracted from transcript, if any."""
        return self._latest_pending_approval

    def get_latest_transcript_path(self, conversation_id: Optional[str] = None) -> Optional[Path]:
        """Find the active conversation's transcript file based on recent modification time.
        Prefers transcript_full.jsonl to ensure full, untruncated messages are parsed.
        Checks all known brain directories (~/.gemini/antigravity and ~/.gemini/antigravity-ide).
        """
        try:
            bases = getattr(self, "brain_bases", [self.brain_base])
            if conversation_id:
                for base in bases:
                    cand = base / conversation_id / ".system_generated" / "logs" / "transcript_full.jsonl"
                    if cand.exists() and cand.stat().st_size > 0:
                        return cand
                    cand_compat = base / conversation_id / ".system_generated" / "logs" / "transcript.jsonl"
                    if cand_compat.exists() and cand_compat.stat().st_size > 0:
                        return cand_compat

            transcripts = []
            for base in bases:
                if base.exists():
                    transcripts.extend(list(base.glob("*/.system_generated/logs/transcript*.jsonl")))

            if not transcripts:
                return None

            transcripts.sort(key=lambda p: p.stat().st_mtime, reverse=True)
            candidate = transcripts[0]
            if candidate.name == "transcript.jsonl":
                full_sibling = candidate.parent / "transcript_full.jsonl"
                if full_sibling.exists() and full_sibling.stat().st_size > 0:
                    return full_sibling
            return candidate
        except Exception:
            return None

    def _parse_all_turns(self, conversation_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Parse and cache all turns from the active transcript file."""
        if not conversation_id:
            try:
                from integrations.antigravity.adapter import antigravity_adapter
                ag_st = antigravity_adapter.get_status()
                conversation_id = ag_st.get("active_conversation_id")
            except Exception:
                pass
        transcript_path = self.get_latest_transcript_path(conversation_id=conversation_id)
        if not transcript_path or not transcript_path.exists():
            self._latest_pending_approval = None
            self._cached_key = None
            self._cached_turns = []
            return []

        try:
            stat = transcript_path.stat()
            mtime = stat.st_mtime
            size = stat.st_size
            is_stale_inactivity = (time.time() - mtime) > 7.0
            cache_sig = (
                str(transcript_path),
                mtime,
                size,
                is_stale_inactivity,
                self._stopped_active,
                len(self._resolved_approvals),
            )
            if self._cached_key == cache_sig and self._cached_turns:
                return self._cached_turns

            turns: List[Dict[str, Any]] = []
            current_agent_turn: Optional[Dict[str, Any]] = None
            session_id = transcript_path.parent.parent.parent.name
            session_dir = transcript_path.parent.parent.parent

            with open(transcript_path, "r", encoding="utf-8") as f:
                for line in f:
                    try:
                        step = json.loads(line)
                        stype = step.get("type")
                        raw_content = (step.get("content") or "").strip()
                        content = step_output_resolver.resolve_output(raw_content, session_dir=session_dir) or raw_content
                        tools = step.get("tool_calls") or []
                        thinking = (step.get("thinking") or "").strip()
                        created_at = step.get("created_at")

                        if stype == "USER_INPUT" and content:
                            self._stopped_active = False
                            clean = TranscriptStepParser.clean_user_content(content)
                            if clean:
                                if current_agent_turn:
                                    current_agent_turn["is_working"] = False
                                    for prev_it in current_agent_turn.get("items", []):
                                        prev_it["requires_permission"] = False
                                        prev_it["status"] = "done"
                                    turns.append(current_agent_turn)
                                    current_agent_turn = None
                                turn_idx = len(turns)
                                turns.append({
                                    "id": f"turn-{turn_idx}",
                                    "turn_index": turn_idx,
                                    "role": "user",
                                    "text": clean,
                                    "timestamp": created_at,
                                })

                        elif stype == "PLANNER_RESPONSE":
                            if not current_agent_turn:
                                turn_idx = len(turns)
                                current_agent_turn = {
                                    "id": f"turn-{turn_idx}",
                                    "turn_index": turn_idx,
                                    "role": "agent",
                                    "text": "",
                                    "thinking": "",
                                    "items": [],
                                    "steps": [],
                                    "timestamp": created_at,
                                    "is_working": True,
                                }

                            if thinking:
                                word_count = len(thinking.split())
                                est_sec = max(1, min(15, max(1, word_count // 45)))
                                current_agent_turn["items"].append({
                                    "id": f"item-{len(current_agent_turn['items'])}",
                                    "type": "thought",
                                    "title": f"Thought for {est_sec}s",
                                    "text": thinking,
                                    "timestamp": created_at,
                                })
                                if current_agent_turn["thinking"]:
                                    current_agent_turn["thinking"] += "\n\n" + thinking
                                else:
                                    current_agent_turn["thinking"] = thinking

                            if tools:
                                for t in tools:
                                    item = TranscriptStepParser.parse_tool_call(
                                        tool=t,
                                        turn_id=current_agent_turn["id"],
                                        item_index=len(current_agent_turn["items"]),
                                        resolved_approvals=self._resolved_approvals,
                                    )
                                    current_agent_turn["items"].append(item)
                                    current_agent_turn["steps"].append(item)

                            if content and not tools:
                                current_agent_turn["text"] = content
                                current_agent_turn["is_working"] = False
                                for it in current_agent_turn["items"]:
                                    it["requires_permission"] = False
                                    it["status"] = "done"
                            elif content:
                                current_agent_turn["text"] = content

                        elif (
                            stype in (
                                "RUN_COMMAND",
                                "WRITE_TO_FILE",
                                "REPLACE_FILE_CONTENT",
                                "MULTI_REPLACE_FILE_CONTENT",
                                "VIEW_FILE",
                                "GREP_SEARCH",
                                "LIST_DIRECTORY",
                                "GENERIC",
                                "FIND_BY_NAME",
                                "ASK_QUESTION",
                            )
                            and current_agent_turn
                            and current_agent_turn.get("items")
                        ):
                            last_item = current_agent_turn["items"][-1]
                            if last_item.get("type") == "action":
                                last_item["requires_permission"] = False
                                last_item["status"] = "done"
                                last_item["question_data"] = None
                                if last_item.get("kind") == "search":
                                    matches = re.findall(r'"LineNumber":', content or "")
                                    if matches:
                                        last_item["extra"] = f"{len(matches)} results"
                                    elif "No results found" in (content or ""):
                                        last_item["extra"] = "0 results"
                                elif last_item.get("kind") == "command":
                                    exit_code = step.get("exit_code")
                                    if exit_code is not None:
                                        last_item["exit_code"] = exit_code
                                    clean_out = content or ""
                                    if "\t\t\t\tOutput:\n" in clean_out:
                                        clean_out = clean_out.split("\t\t\t\tOutput:\n", 1)[1]
                                    elif "\t\t\t\tStdout:\n" in clean_out:
                                        clean_out = clean_out.split("\t\t\t\tStdout:\n", 1)[1]
                                    last_item["output"] = clean_out.strip()

                    except Exception:
                        continue

            pending_question_data = None
            pending_approval_data = None

            if current_agent_turn:
                agent_items = current_agent_turn.get("items", [])
                last_action = agent_items[-1] if agent_items else None

                is_waiting_for_question = bool(
                    last_action
                    and last_action.get("kind") == "question"
                    and last_action.get("question_data")
                    and not self._stopped_active
                )
                is_waiting_for_approval = bool(
                    last_action
                    and last_action.get("requires_permission")
                    and last_action.get("status") == "pending"
                    and not last_action.get("approval_decision")
                    and not last_action.get("output")
                    and not self._stopped_active
                )

                if is_waiting_for_question:
                    pending_question_data = last_action.get("question_data")
                    current_agent_turn["is_working"] = False
                elif is_waiting_for_approval:
                    pending_approval_data = {
                        "step_id": last_action.get("step_id"),
                        "request_type": last_action.get("permission_type") or "command",
                        "target": (
                            last_action.get("command")
                            or last_action.get("file")
                            or last_action.get("target")
                            or ""
                        ),
                        "title": last_action.get("permission_title") or "Permission Required",
                        "description": (
                            last_action.get("permission_desc")
                            or "Agent is requesting execution approval."
                        ),
                        "command": last_action.get("command"),
                        "file": last_action.get("file"),
                        "diff": last_action.get("diff"),
                        "options": last_action.get("approval_options"),
                        "allow_custom_response": last_action.get("allow_custom_response", True),
                    }
                    current_agent_turn["is_working"] = False

                if is_stale_inactivity or self._stopped_active:
                    current_agent_turn["is_working"] = False

                turns.append(current_agent_turn)

            self._latest_pending_approval = pending_approval_data

            try:
                from services.interaction_service import interaction_service
                interaction_service.sync_question_from_transcript(
                    session_id=session_id,
                    question_data=pending_question_data,
                    is_active=bool(pending_question_data),
                )
            except Exception:
                pass

            self._cached_key = cache_sig
            self._cached_turns = turns
            return turns

        except Exception:
            return []

    def get_recent_conversation(
        self, limit: int = 40, conversation_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Return the latest `limit` conversation turns."""
        turns = self._parse_all_turns(conversation_id=conversation_id)
        return turns[-limit:] if limit > 0 else turns

    def get_paginated_conversation(
        self,
        limit: int = 15,
        before: Optional[int] = None,
        conversation_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Return a cursor-paginated slice of conversation turns for upward scroll lazy-loading.
        """
        turns = self._parse_all_turns(conversation_id=conversation_id)
        total = len(turns)
        if total == 0:
            return {
                "messages": [],
                "total": 0,
                "oldest_index": 0,
                "has_more": False,
            }

        end_idx = total if before is None else max(0, min(total, int(before)))
        start_idx = max(0, end_idx - max(1, int(limit)))
        sliced = turns[start_idx:end_idx]

        return {
            "messages": sliced,
            "total": total,
            "oldest_index": start_idx,
            "has_more": start_idx > 0,
        }


conversation_service = ConversationService()
