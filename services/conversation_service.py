"""Service to read, cache, and paginate the live Antigravity IDE conversation transcript."""

import hashlib
import json
import re
import time
from pathlib import Path
from typing import List, Dict, Any, Optional
from services.diff_helper import parse_edit_tool_diff


class ConversationService:
    """
    Extracts genuine Antigravity chat turns directly from local IDE transcripts.
    Includes in-memory turn caching keyed on file (path, mtime, size) and
    cursor-based upward pagination (before=<turn_index>, limit=<count>).
    """

    def __init__(self):
        self.brain_base = Path.home() / ".gemini" / "antigravity-ide" / "brain"
        self._stopped_active: bool = False
        self._resolved_approvals: Dict[str, str] = {}
        self._latest_pending_approval: Optional[Dict[str, Any]] = None
        # Cache parsed full turns when transcript mtime/size hasn't changed
        self._cached_key: Optional[tuple] = None
        self._cached_turns: List[Dict[str, Any]] = []

    def mark_active_turn_stopped(self):
        """Signal that the user requested emergency stop so the UI immediately reflects it."""
        self._stopped_active = True
        self._cached_key = None

    def mark_approval_resolved(self, step_id: Optional[str], decision: str, target: Optional[str] = None):
        """Record that a pending approval step was answered so it does not re-trigger."""
        if step_id:
            self._resolved_approvals[step_id] = decision
        if target:
            target_hash = hashlib.md5(target.encode("utf-8", errors="ignore")).hexdigest()[:8]
            self._resolved_approvals[f"cmd-{target_hash}"] = decision
        if self._latest_pending_approval:
            if not step_id or self._latest_pending_approval.get("step_id") == step_id or self._latest_pending_approval.get("target") == target:
                self._latest_pending_approval = None
        self._cached_key = None

    def get_pending_approval(self) -> Optional[Dict[str, Any]]:
        """Return currently active command/tool approval extracted from transcript, if any."""
        return self._latest_pending_approval

    def get_latest_transcript_path(self) -> Optional[Path]:
        """Find the active conversation's transcript file based on recent modification time.
        Prefers transcript_full.jsonl to ensure full, untruncated messages are parsed.
        """
        try:
            if not self.brain_base.exists():
                return None
            transcripts = list(self.brain_base.glob("*/.system_generated/logs/transcript*.jsonl"))
            if not transcripts:
                return None
            transcripts.sort(key=lambda p: p.stat().st_mtime, reverse=True)
            candidate = transcripts[0]
            # If transcript.jsonl was picked, check if sibling transcript_full.jsonl exists with full content
            if candidate.name == "transcript.jsonl":
                full_sibling = candidate.parent / "transcript_full.jsonl"
                if full_sibling.exists() and full_sibling.stat().st_size > 0:
                    return full_sibling
            return candidate
        except Exception:
            return None

    def _clean_arg(self, val: Any) -> Any:
        if isinstance(val, str):
            s = val.strip()
            if (s.startswith('{') and s.endswith('}')) or (s.startswith('[') and s.endswith(']')):
                try:
                    return json.loads(s)
                except Exception:
                    pass
            if s.startswith('"') and s.endswith('"') and len(s) >= 2:
                s = s[1:-1].replace('\\"', '"').replace('\\\\', '\\')
            return s
        return val

    def _normalize_question_options(self, raw_options: Any) -> List[Dict[str, Any]]:
        """Normalize question options whether provided as strings or structured objects."""
        if not raw_options:
            return []
        if isinstance(raw_options, str):
            try:
                raw_options = json.loads(raw_options)
            except Exception:
                raw_options = [s.strip() for s in raw_options.split(",") if s.strip()]
        if not isinstance(raw_options, list):
            return []

        normalized: List[Dict[str, Any]] = []
        for idx, opt in enumerate(raw_options):
            if isinstance(opt, dict):
                label = str(
                    opt.get("label")
                    or opt.get("title")
                    or opt.get("text")
                    or opt.get("value")
                    or opt.get("name")
                    or f"Option {idx + 1}"
                ).strip()
                desc = opt.get("description") or opt.get("detail") or opt.get("hint")
                is_rec = bool(opt.get("is_recommended") or opt.get("recommended") or ("(recommended)" in label.lower()))
                opt_id = str(opt.get("id") or f"opt_{idx + 1}")
                normalized.append({
                    "id": opt_id,
                    "label": label,
                    "description": str(desc).strip() if desc else None,
                    "is_recommended": is_rec,
                })
            elif opt is not None:
                label = str(opt).strip()
                if label:
                    normalized.append({
                        "id": f"opt_{idx + 1}",
                        "label": label,
                        "description": None,
                        "is_recommended": (idx == 0 and "(recommended)" in label.lower()) or "(recommended)" in label.lower(),
                    })
        return normalized

    def _parse_all_turns(self) -> List[Dict[str, Any]]:
        """Parse and cache all turns from the active transcript file."""
        transcript_path = self.get_latest_transcript_path()
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

            with open(transcript_path, "r", encoding="utf-8") as f:
                for line in f:
                    try:
                        step = json.loads(line)
                        stype = step.get("type")
                        content = (step.get("content") or "").strip()
                        tools = step.get("tool_calls") or []
                        thinking = (step.get("thinking") or "").strip()
                        created_at = step.get("created_at")

                        if stype == "USER_INPUT" and content:
                            self._stopped_active = False
                            clean = content

                            # If <USER_REQUEST> tags exist, extract strictly the innermost user request
                            req_match = re.search(r"<USER_REQUEST>(.*?)</USER_REQUEST>", clean, flags=re.DOTALL)
                            if req_match:
                                clean = req_match.group(1).strip()
                            else:
                                clean = re.sub(r"<USER_REQUEST>\s*", "", clean)
                                clean = re.sub(r"</USER_REQUEST>.*", "", clean, flags=re.DOTALL).strip()

                            # Clean any leaked metadata or IDE prefixes
                            clean = re.sub(r"<ADDITIONAL_METADATA>.*", "", clean, flags=re.DOTALL).strip()
                            clean = re.sub(r"<USER_SETTINGS_CHANGE>.*", "", clean, flags=re.DOTALL).strip()

                            # If IDE injected action history prefix (e.g. "The USER performed the following action: ..."),
                            # or repeated chat logs, strip them down to the actual user message
                            if "The USER performed the following action:" in clean:
                                parts = clean.split("The USER performed the following action:", 1)
                                remainder = parts[1]
                                # Look for user request after action description
                                if "\n\n" in remainder:
                                    clean = remainder.split("\n\n", 1)[1].strip()

                            clean = clean.strip()

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
                                    "timestamp": created_at
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
                                    "is_working": True
                                }

                            if thinking:
                                word_count = len(thinking.split())
                                est_sec = max(1, min(15, max(1, word_count // 45)))
                                current_agent_turn["items"].append({
                                    "id": f"item-{len(current_agent_turn['items'])}",
                                    "type": "thought",
                                    "title": f"Thought for {est_sec}s",
                                    "text": thinking,
                                    "timestamp": created_at
                                })
                                if current_agent_turn["thinking"]:
                                    current_agent_turn["thinking"] += "\n\n" + thinking
                                else:
                                    current_agent_turn["thinking"] = thinking

                            if tools:
                                for t in tools:
                                    name = t.get("name", "")
                                    raw_args = t.get("args") or {}
                                    args = {k: self._clean_arg(v) for k, v in raw_args.items()}

                                    kind = "generic"
                                    verb = "Used"
                                    target = args.get("toolSummary") or args.get("toolAction") or name
                                    requires_perm = False
                                    perm_type = None
                                    perm_title = None
                                    perm_desc = None
                                    approval_options = None
                                    summary = args.get("toolSummary") or args.get("toolAction") or name
                                    command = None
                                    cwd = None
                                    cwd_short = None
                                    file_target = None
                                    file_short = None
                                    instruction = None
                                    task_name = None
                                    extra = None
                                    diff_info = None
                                    question_payload = None

                                    if name == "view_file":
                                        verb = "Analyzed"
                                        kind = "analyze"
                                        file_target = args.get("AbsolutePath") or ""
                                        file_parts = re.split(r"[\\/]", file_target)
                                        file_short = file_parts[-1] if file_parts else file_target
                                        start_l = args.get("StartLine")
                                        end_l = args.get("EndLine")
                                        if start_l and end_l:
                                            target = f"{file_short} #L{start_l}-{end_l}"
                                        elif start_l:
                                            target = f"{file_short} #L{start_l}"
                                        else:
                                            target = file_short

                                    elif name in ("grep_search", "search_web"):
                                        verb = "Searched"
                                        kind = "search"
                                        query = args.get("Query") or args.get("query") or ""
                                        target = query

                                    elif name in ("write_to_file", "replace_file_content", "multi_replace_file_content"):
                                        kind = "edit"
                                        file_target = args.get("TargetFile") or ""
                                        file_parts = re.split(r"[\\/]", file_target)
                                        file_short = file_parts[-1] if file_parts else file_target
                                        instruction = args.get("Description") or args.get("Instruction") or ""
                                        requires_perm = False

                                        workspace_root = str(Path(__file__).resolve().parent.parent)
                                        target, extra, diff_info = parse_edit_tool_diff(name, args, workspace_root=workspace_root)
                                        if name == "write_to_file":
                                            verb = "Created" if (diff_info and diff_info.get("is_new_file", True)) else "Edited"
                                        else:
                                            verb = "Edited"

                                    elif name in ("run_command", "execute_bash"):
                                        verb = "Ran"
                                        kind = "command"
                                        command = args.get("CommandLine") or args.get("command") or ""
                                        cwd = args.get("Cwd") or args.get("cwd") or ""
                                        cwd_parts = re.split(r"[\\/]", cwd) if cwd else []
                                        cwd_short = f".../{cwd_parts[-1]}" if cwd_parts and cwd_parts[-1] else ".../workspace"
                                        target = command

                                        safe_val = args.get("SafeToAutoRun")
                                        not_safe_auto = (safe_val is False) or (str(safe_val).lower() == "false")
                                        bypass = bool(args.get("BypassSandbox", False))

                                        if not_safe_auto or bypass:
                                            requires_perm = True
                                            perm_type = "command"
                                            perm_title = "Command Approval Required" if not bypass else "Elevated Command Approval Required"
                                            perm_desc = (
                                                "Antigravity is waiting for your permission to execute this terminal command."
                                                if not bypass
                                                else "This command requests unsandboxed execution. Approve, Always Allow, Deny, or send custom instructions."
                                            )
                                            approval_options = [
                                                {"id": "allow", "label": "Allow", "description": "Run this command once"},
                                                {"id": "always_allow", "label": "Always Allow", "description": "Allow similar commands in this session"},
                                                {"id": "deny", "label": "Deny", "description": "Reject command or provide custom instructions"},
                                            ]
                                        else:
                                            requires_perm = False

                                    elif name == "browser_subagent":
                                        verb = "Explored"
                                        kind = "browser"
                                        requires_perm = False
                                        task_name = args.get("TaskName") or args.get("TaskSummary") or "Web exploration"
                                        target = f"1 browser: {task_name}"

                                    elif name in ("ask_question", "notify_user"):
                                        blocked = args.get("BlockedOnUser")
                                        raw_questions = args.get("questions") or args.get("Questions") or []
                                        if isinstance(raw_questions, str):
                                            try:
                                                raw_questions = json.loads(raw_questions)
                                            except Exception:
                                                raw_questions = []
                                        q_obj = raw_questions[0] if (isinstance(raw_questions, list) and raw_questions and isinstance(raw_questions[0], dict)) else {}
                                        q_text = (
                                            q_obj.get("question")
                                            or q_obj.get("prompt")
                                            or q_obj.get("title")
                                            or args.get("Question")
                                            or args.get("Prompt")
                                            or args.get("Message")
                                            or ("Agent Question" if name == "ask_question" else "")
                                        )
                                        raw_opts = (
                                            q_obj.get("options")
                                            or q_obj.get("choices")
                                            or args.get("Options")
                                            or args.get("options")
                                            or args.get("Choices")
                                            or []
                                        )
                                        norm_opts = self._normalize_question_options(raw_opts)
                                        is_multi = bool(
                                            q_obj.get("is_multi_select")
                                            or q_obj.get("multiSelect")
                                            or args.get("is_multi_select")
                                            or args.get("MultiSelect")
                                            or False
                                        )
                                        description_text = (
                                            q_obj.get("description")
                                            or q_obj.get("context")
                                            or args.get("Description")
                                            or "The agent is awaiting your decision or custom instructions to proceed."
                                        )

                                        if name == "ask_question" or blocked is True or str(blocked).lower() == "true" or norm_opts:
                                            verb = "Asked"
                                            kind = "question"
                                            requires_perm = False
                                            target = q_text or "Agent Question"
                                            summary = f"Question: {target}"
                                            extra = f"{len(norm_opts)} choices" if norm_opts else "Custom input"
                                            question_payload = {
                                                "question": q_text or "Agent Question",
                                                "description": description_text,
                                                "options": norm_opts,
                                                "is_multi_select": is_multi,
                                                "allow_custom_response": True,
                                            }

                                    for prev_item in current_agent_turn["items"]:
                                        if prev_item.get("type") == "action":
                                            prev_item["requires_permission"] = False
                                            prev_item["status"] = "done"

                                    item_idx = len(current_agent_turn["items"])
                                    item_id = f"item-{item_idx}"
                                    turn_id = current_agent_turn["id"]
                                    step_key = f"{turn_id}-{item_id}"
                                    cmd_hash_key = None
                                    if command:
                                        cmd_hash_key = f"cmd-{hashlib.md5(command.encode('utf-8', errors='ignore')).hexdigest()[:8]}"

                                    resolved_decision = self._resolved_approvals.get(step_key) or (
                                        self._resolved_approvals.get(cmd_hash_key) if cmd_hash_key else None
                                    )

                                    item = {
                                        "id": item_id,
                                        "step_id": step_key,
                                        "type": "action",
                                        "name": name,
                                        "kind": kind,
                                        "verb": verb,
                                        "target": target,
                                        "summary": summary,
                                        "command": command,
                                        "cwd": cwd,
                                        "cwd_short": cwd_short,
                                        "file": file_target,
                                        "file_short": file_short,
                                        "instruction": instruction,
                                        "task_name": task_name,
                                        "extra": extra,
                                        "diff": diff_info,
                                        "requires_permission": requires_perm,
                                        "requires_native_ide": False,
                                        "permission_type": perm_type,
                                        "permission_title": perm_title,
                                        "permission_desc": perm_desc,
                                        "approval_options": approval_options,
                                        "allow_custom_response": True if requires_perm else False,
                                        "approval_decision": resolved_decision,
                                        "question_data": question_payload,
                                        "status": "done" if (not requires_perm or resolved_decision) else "pending"
                                    }
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

                        elif stype in (
                            "RUN_COMMAND",
                            "WRITE_TO_FILE",
                            "REPLACE_FILE_CONTENT",
                            "MULTI_REPLACE_FILE_CONTENT",
                            "VIEW_FILE",
                            "GREP_SEARCH",
                            "LIST_DIRECTORY",
                            "GENERIC",
                            "CODE_ACTION",
                            "TOOL_RESPONSE",
                            "ASK_QUESTION",
                        ) and current_agent_turn and current_agent_turn.get("items"):
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
                        "target": last_action.get("command") or last_action.get("file") or last_action.get("target") or "",
                        "title": last_action.get("permission_title") or "Command Approval Required",
                        "description": last_action.get("permission_desc") or "Antigravity is waiting for your permission to run this command.",
                        "command": last_action.get("command"),
                        "cwd": last_action.get("cwd"),
                        "cwd_short": last_action.get("cwd_short"),
                        "options": last_action.get("approval_options") or [
                            {"id": "allow", "label": "Allow", "description": "Run this command once"},
                            {"id": "always_allow", "label": "Always Allow", "description": "Allow similar commands in this session"},
                            {"id": "deny", "label": "Deny", "description": "Reject command or provide custom instructions"},
                        ],
                        "allow_custom_response": True,
                    }
                    current_agent_turn["is_working"] = True
                elif is_stale_inactivity or self._stopped_active:
                    current_agent_turn["is_working"] = False
                    for it in current_agent_turn["items"]:
                        it["status"] = "done"

                turns.append(current_agent_turn)

            self._latest_pending_approval = pending_approval_data

            try:
                from services.interaction_service import interaction_service
                interaction_service.sync_question_from_transcript(
                    session_id=session_id,
                    question_data=pending_question_data,
                    is_active=bool(pending_question_data)
                )
            except Exception:
                pass

            self._cached_key = cache_sig
            self._cached_turns = turns
            return turns

        except Exception:
            return []

    def get_recent_conversation(self, limit: int = 40) -> List[Dict[str, Any]]:
        """Return the latest `limit` conversation turns."""
        turns = self._parse_all_turns()
        return turns[-limit:] if limit > 0 else turns

    def get_paginated_conversation(
        self,
        limit: int = 15,
        before: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Return a cursor-paginated slice of conversation turns for upward scroll lazy-loading.
        - When `before` is None: returns the latest `limit` turns.
        - When `before` is an integer turn_index: returns up to `limit` turns immediately preceding `before`.
        """
        turns = self._parse_all_turns()
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
