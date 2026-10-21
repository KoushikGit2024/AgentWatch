"""Service to read and parse the live Antigravity IDE conversation transcript."""

import json
import re
import time
from pathlib import Path
from typing import List, Dict, Any, Optional

class ConversationService:
    """Extracts genuine Antigravity chat turns directly from local IDE transcripts."""

    def __init__(self):
        self.brain_base = Path.home() / ".gemini" / "antigravity-ide" / "brain"
        self._stopped_active: bool = False

    def mark_active_turn_stopped(self):
        """Signal that the user requested emergency stop so the UI immediately reflects it."""
        self._stopped_active = True

    def get_latest_transcript_path(self) -> Optional[Path]:
        """Find the active conversation's transcript file based on recent modification time."""
        try:
            if not self.brain_base.exists():
                return None
            transcripts = list(self.brain_base.glob("*/.system_generated/logs/transcript.jsonl"))
            if not transcripts:
                return None
            transcripts.sort(key=lambda p: p.stat().st_mtime, reverse=True)
            return transcripts[0]
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

    def get_recent_conversation(self, limit: int = 40) -> List[Dict[str, Any]]:
        """
        Parse the active Antigravity transcript into rich conversational turns:
        - User prompts with clean extracted text
        - Agent thinking process (collapsible thought stream)
        - Agent tool execution steps & permissions (terminal commands, file edits, browser, questions)
        - Verified working/active state indicator
        - Agent markdown text responses
        """
        transcript_path = self.get_latest_transcript_path()
        if not transcript_path or not transcript_path.exists():
            return []

        turns: List[Dict[str, Any]] = []
        current_agent_turn: Optional[Dict[str, Any]] = None

        try:
            mtime = transcript_path.stat().st_mtime
            is_stale_inactivity = (time.time() - mtime) > 7.0

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
                            clean = re.sub(r"<USER_REQUEST>\s*", "", content)
                            clean = re.sub(r"</USER_REQUEST>.*", "", clean, flags=re.DOTALL).strip()
                            clean = re.sub(r"<ADDITIONAL_METADATA>.*", "", clean, flags=re.DOTALL).strip()
                            clean = re.sub(r"<USER_SETTINGS_CHANGE>.*", "", clean, flags=re.DOTALL).strip()
                            clean = clean.strip()

                            if clean:
                                if current_agent_turn:
                                    current_agent_turn["is_working"] = False
                                    turns.append(current_agent_turn)
                                    current_agent_turn = None
                                turns.append({
                                    "id": f"turn-{len(turns)}",
                                    "role": "user",
                                    "text": clean,
                                    "timestamp": created_at
                                })

                        elif stype == "PLANNER_RESPONSE":
                            if not current_agent_turn:
                                current_agent_turn = {
                                    "id": f"turn-{len(turns)}",
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
                                        verb = "Created" if name == "write_to_file" else "Edited"
                                        requires_perm = False
                                        file_target = args.get("TargetFile") or ""
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
                                        instruction = args.get("Description") or args.get("Instruction") or ""

                                        target_content = args.get("TargetContent")
                                        replacement_content = args.get("ReplacementContent") or args.get("CodeContent")
                                        if name == "write_to_file" and replacement_content:
                                            line_cnt = len(str(replacement_content).splitlines())
                                            extra = f"+{line_cnt} lines"
                                        elif target_content or replacement_content:
                                            old_cnt = len(str(target_content).splitlines()) if target_content else 0
                                            new_cnt = len(str(replacement_content).splitlines()) if replacement_content else 0
                                            extra = f"-{old_cnt} +{new_cnt} lines"
                                        else:
                                            extra = None

                                        if target_content or replacement_content:
                                            diff_info = {
                                                "target_content": str(target_content)[:2000] if target_content else None,
                                                "replacement_content": str(replacement_content)[:2000] if replacement_content else None,
                                                "start_line": start_l,
                                                "end_line": end_l
                                            }

                                    elif name == "run_command":
                                        verb = "Ran"
                                        kind = "command"
                                        command = args.get("CommandLine") or ""
                                        cwd = args.get("Cwd") or ""
                                        cwd_parts = re.split(r"[\\/]", cwd)
                                        cwd_short = f".../{cwd_parts[-1]}" if cwd_parts else ".../workspace"
                                        target = command[:60] + "..." if len(command) > 60 else command
                                        # Elevated unsandboxed commands require confirmation in native IDE
                                        bypass = bool(args.get("BypassSandbox", False))
                                        if bypass:
                                            requires_perm = True
                                            perm_type = "native_permission"
                                            perm_title = "Elevation Confirmation Required"
                                            perm_desc = "Sandbox bypass requested. Please confirm in the Antigravity desktop window."
                                        else:
                                            requires_perm = False

                                    elif name == "browser_subagent":
                                        verb = "Explored"
                                        kind = "browser"
                                        requires_perm = False
                                        task_name = args.get("TaskName") or args.get("TaskSummary") or "Web exploration"
                                        target = f"1 browser: {task_name}"

                                    elif name == "ask_question":
                                        verb = "Asked"
                                        kind = "question"
                                        requires_perm = False
                                        raw_questions = args.get("questions") or []
                                        q_obj = raw_questions[0] if raw_questions else {}
                                        q_text = q_obj.get("question") or args.get("Prompt") or "Agent Question"
                                        target = q_text[:60] + "..." if len(q_text) > 60 else q_text
                                        summary = f"Question: {q_text[:60]}"
                                        extra = f"{len(q_obj.get('options', []))} choices" if q_obj.get("options") else None

                                    # Any prior tool in the turn has already executed
                                    for prev_item in current_agent_turn["items"]:
                                        if prev_item.get("type") == "action":
                                            prev_item["requires_permission"] = False
                                            prev_item["status"] = "done"

                                    item = {
                                        "id": f"item-{len(current_agent_turn['items'])}",
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
                                        "requires_native_ide": bool(requires_perm and perm_type == "native_permission"),
                                        "permission_type": perm_type,
                                        "permission_title": perm_title,
                                        "permission_desc": perm_desc,
                                        "question_data": {
                                            "question": q_text if name == "ask_question" else None,
                                            "options": q_obj.get("options", []) if name == "ask_question" else [],
                                            "is_multi_select": bool(q_obj.get("is_multi_select", False)) if name == "ask_question" else False
                                        } if name == "ask_question" else None,
                                        "status": "pending" if requires_perm else "done"
                                    }
                                    current_agent_turn["items"].append(item)
                                    current_agent_turn["steps"].append(item)

                            if content:
                                current_agent_turn["text"] = content
                                current_agent_turn["is_working"] = False
                                for it in current_agent_turn["items"]:
                                    it["requires_permission"] = False
                                    it["status"] = "done"

                        # Tool results emitted as specific step types in transcript
                        elif stype in ("RUN_COMMAND", "WRITE_TO_FILE", "REPLACE_FILE_CONTENT", "MULTI_REPLACE_FILE_CONTENT", "VIEW_FILE", "GREP_SEARCH", "LIST_DIRECTORY", "GENERIC", "CODE_ACTION") and current_agent_turn and current_agent_turn.get("items"):
                            last_item = current_agent_turn["items"][-1]
                            if last_item.get("type") == "action":
                                last_item["requires_permission"] = False
                                last_item["status"] = "done"
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
                                    last_item["output"] = clean_out.strip()[:2000]

                    except Exception:
                        continue

            if current_agent_turn:
                # If idle for > 7s or user stopped, mark not working
                if is_stale_inactivity or self._stopped_active:
                    current_agent_turn["is_working"] = False
                    for it in current_agent_turn["items"]:
                        it["status"] = "done"
                turns.append(current_agent_turn)

            # Reconcile dynamic agent questions with InteractionService
            session_id = transcript_path.parent.parent.parent.name
            pending_question_data = None
            if turns and turns[-1].get("role") == "agent" and turns[-1].get("is_working"):
                agent_items = turns[-1].get("items", [])
                if agent_items and agent_items[-1].get("name") == "ask_question":
                    pending_question_data = agent_items[-1].get("question_data")
                    turns[-1]["is_working"] = False

            try:
                from services.interaction_service import interaction_service
                interaction_service.sync_question_from_transcript(
                    session_id=session_id,
                    question_data=pending_question_data,
                    is_active=bool(pending_question_data)
                )
            except Exception:
                pass

        except Exception:
            return []

        return turns[-limit:]


conversation_service = ConversationService()
