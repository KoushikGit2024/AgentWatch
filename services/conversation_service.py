"""Service to read and parse the live Antigravity IDE conversation transcript."""

import json
import re
from pathlib import Path
from typing import List, Dict, Any, Optional

class ConversationService:
    """Extracts genuine Antigravity chat turns directly from local IDE transcripts."""

    def __init__(self):
        self.brain_base = Path.home() / ".gemini" / "antigravity-ide" / "brain"

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
        - Working/active state indicator
        - Agent markdown text responses
        """
        transcript_path = self.get_latest_transcript_path()
        if not transcript_path or not transcript_path.exists():
            return []

        turns: List[Dict[str, Any]] = []
        current_agent_turn: Optional[Dict[str, Any]] = None

        try:
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
                                    "steps": [],
                                    "timestamp": created_at,
                                    "is_working": True
                                }

                            if thinking:
                                if current_agent_turn["thinking"]:
                                    current_agent_turn["thinking"] += "\n\n" + thinking
                                else:
                                    current_agent_turn["thinking"] = thinking

                            if tools:
                                for t in tools:
                                    name = t.get("name", "")
                                    raw_args = t.get("args") or {}
                                    args = {k: self._clean_arg(v) for k, v in raw_args.items()}

                                    # Determine step kind and permission metadata
                                    kind = "generic"
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

                                    if name == "run_command":
                                        kind = "command"
                                        requires_perm = True
                                        perm_type = "command"
                                        perm_title = "Command Execution Request"
                                        perm_desc = "Terminal execution requires user authorization."
                                        command = args.get("CommandLine") or ""
                                        cwd = args.get("Cwd") or ""
                                        cwd_parts = re.split(r"[\\/]", cwd)
                                        cwd_short = f".../{cwd_parts[-1]}" if cwd_parts else ".../workspace"
                                        if not summary or summary == name:
                                            summary = f"Run {command[:40]}..." if len(command) > 40 else f"Run {command}"

                                    elif name in ("write_to_file", "replace_file_content", "multi_replace_file_content"):
                                        kind = "file_edit"
                                        requires_perm = True
                                        perm_type = "file"
                                        perm_title = "File Change Request"
                                        perm_desc = "Allow agent to modify or write workspace files."
                                        file_target = args.get("TargetFile") or ""
                                        file_parts = re.split(r"[\\/]", file_target)
                                        file_short = file_parts[-1] if file_parts else file_target
                                        instruction = args.get("Description") or args.get("Instruction") or ""
                                        if not summary or summary == name:
                                            action_word = "Wrote" if name == "write_to_file" else "Edited"
                                            summary = f"{action_word} {file_short}"

                                    elif name == "browser_subagent":
                                        kind = "browser"
                                        requires_perm = True
                                        perm_type = "browser"
                                        perm_title = "Browser & Web Access Request"
                                        perm_desc = "Allow agent to explore and interact with web pages."
                                        task_name = args.get("TaskName") or args.get("TaskSummary") or "Web exploration"
                                        if not summary or summary == name:
                                            summary = f"Explored 1 browser: {task_name}"

                                    elif name in ("view_file", "list_dir"):
                                        kind = "file_view"
                                        file_target = args.get("AbsolutePath") or args.get("DirectoryPath") or ""
                                        file_parts = re.split(r"[\\/]", file_target)
                                        file_short = file_parts[-1] if file_parts else file_target

                                    elif name in ("grep_search", "search_web"):
                                        kind = "search"

                                    elif name == "ask_question":
                                        kind = "question"
                                        requires_perm = True
                                        perm_type = "question"
                                        perm_title = "Agent Decision Required"
                                        perm_desc = "The agent is waiting for your choice."

                                    current_agent_turn["steps"].append({
                                        "id": f"step-{len(current_agent_turn['steps'])}",
                                        "name": name,
                                        "kind": kind,
                                        "summary": summary,
                                        "command": command,
                                        "cwd": cwd,
                                        "cwd_short": cwd_short,
                                        "file": file_target,
                                        "file_short": file_short,
                                        "instruction": instruction,
                                        "task_name": task_name,
                                        "requires_permission": requires_perm,
                                        "permission_type": perm_type,
                                        "permission_title": perm_title,
                                        "permission_desc": perm_desc,
                                        "status": "done"
                                    })

                            if content:
                                current_agent_turn["text"] = content
                                current_agent_turn["is_working"] = False

                    except Exception:
                        continue

            if current_agent_turn:
                turns.append(current_agent_turn)

        except Exception:
            return []

        return turns[-limit:]


conversation_service = ConversationService()

