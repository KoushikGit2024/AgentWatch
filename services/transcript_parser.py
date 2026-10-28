"""Modular parser for individual Antigravity transcript steps and turns."""

import json
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional
from services.diff_helper import parse_edit_tool_diff
from services.step_resolver import step_output_resolver

logger = logging.getLogger(__name__)


class TranscriptStepParser:
    """Parses individual JSONL steps into structured turns, actions, and questions."""

    @staticmethod
    def clean_arg(val: Any) -> Any:
        if isinstance(val, str):
            s = val.strip()
            if (s.startswith("{") and s.endswith("}")) or (s.startswith("[") and s.endswith("]")):
                try:
                    return json.loads(s)
                except Exception:
                    pass
            if s.startswith('"') and s.endswith('"') and len(s) >= 2:
                s = s[1:-1].replace('\\"', '"').replace("\\\\", "\\")
            return s
        return val

    @staticmethod
    def normalize_question_options(raw_options: Any) -> List[Dict[str, Any]]:
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
                is_rec = bool(
                    opt.get("is_recommended")
                    or opt.get("recommended")
                    or ("(recommended)" in label.lower())
                )
                opt_id = str(opt.get("id") or f"opt_{idx + 1}")
                normalized.append(
                    {
                        "id": opt_id,
                        "label": label,
                        "description": str(desc).strip() if desc else None,
                        "is_recommended": is_rec,
                    }
                )
            elif opt is not None:
                label = str(opt).strip()
                if label:
                    normalized.append(
                        {
                            "id": f"opt_{idx + 1}",
                            "label": label,
                            "description": None,
                            "is_recommended": (idx == 0 and "(recommended)" in label.lower())
                            or "(recommended)" in label.lower(),
                        }
                    )
        return normalized

    @classmethod
    def clean_user_content(cls, content: str) -> str:
        """Extract user request text free of IDE markup and metadata tags."""
        clean = content or ""
        req_match = re.search(r"<USER_REQUEST>(.*?)</USER_REQUEST>", clean, flags=re.DOTALL)
        if req_match:
            clean = req_match.group(1).strip()
        else:
            clean = re.sub(r"<USER_REQUEST>\s*", "", clean)
            clean = re.sub(r"</USER_REQUEST>.*", "", clean, flags=re.DOTALL).strip()

        clean = re.sub(r"<ADDITIONAL_METADATA>.*", "", clean, flags=re.DOTALL).strip()
        clean = re.sub(r"<USER_SETTINGS_CHANGE>.*", "", clean, flags=re.DOTALL).strip()

        if "The USER performed the following action:" in clean:
            parts = clean.split("The USER performed the following action:", 1)
            remainder = parts[1]
            if "\n\n" in remainder:
                clean = remainder.split("\n\n", 1)[1].strip()

        return clean.strip()

    @classmethod
    def parse_tool_call(
        cls,
        tool: Dict[str, Any],
        turn_id: str,
        item_index: int,
        resolved_approvals: Dict[str, str],
    ) -> Dict[str, Any]:
        """Convert an individual tool_call dictionary into a rich action object."""
        name = tool.get("name", "")
        raw_args = tool.get("args") or {}
        args = {k: cls.clean_arg(v) for k, v in raw_args.items()}

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
            file_short = "/".join(file_parts[-2:]) if len(file_parts) >= 2 else file_target
            target = file_short or file_target
            summary = f"Analyzed {file_short}" if file_short else "Analyzed file"
        elif name == "read_file":
            verb = "Read"
            kind = "read"
            file_target = args.get("Path") or ""
            file_parts = re.split(r"[\\/]", file_target)
            file_short = "/".join(file_parts[-2:]) if len(file_parts) >= 2 else file_target
            target = file_short or file_target
            summary = f"Read {file_short}" if file_short else "Read file"
        elif name == "edit_file":
            verb = "Edited"
            kind = "edit"
            file_target = args.get("Path") or ""
            file_parts = re.split(r"[\\/]", file_target)
            file_short = "/".join(file_parts[-2:]) if len(file_parts) >= 2 else file_target
            target = file_short or file_target
            summary = f"Edited {file_short}" if file_short else "Edited file"
            diff_info = parse_edit_tool_diff(args.get("Target") or "", args.get("Replacement") or "")
        elif name in ("write_file", "write_to_file"):
            verb = "Created"
            kind = "create"
            file_target = args.get("Path") or args.get("AbsolutePath") or ""
            file_parts = re.split(r"[\\/]", file_target)
            file_short = "/".join(file_parts[-2:]) if len(file_parts) >= 2 else file_target
            target = file_short or file_target
            summary = f"Wrote {file_short}" if file_short else "Wrote file"
        elif name == "grep_search":
            verb = "Searched"
            kind = "search"
            query = args.get("Query") or ""
            target = f'"{query}"' if query else "Codebase"
            summary = f"Searched for {target}"
        elif name == "find_by_name":
            verb = "Located"
            kind = "locate"
            pattern = args.get("Pattern") or ""
            target = pattern or "files"
            summary = f"Located {target}"
        elif name == "list_dir":
            verb = "Listed"
            kind = "list"
            dir_path = args.get("DirectoryPath") or ""
            parts = re.split(r"[\\/]", dir_path)
            cwd_short = "/".join(parts[-2:]) if len(parts) >= 2 else dir_path
            target = cwd_short or "directory"
            summary = f"Listed {target}"
        elif name == "ask_question":
            kind = "question"
            verb = "Asked"
            questions_list = args.get("questions") or []
            if questions_list and isinstance(questions_list, list):
                first_q = questions_list[0]
                q_text = str(first_q.get("question") or "Question").strip()
                target = q_text
                summary = q_text
                parsed_questions = []
                for q_idx, q_item in enumerate(questions_list):
                    q_id = str(q_item.get("id") or f"q_{q_idx + 1}")
                    q_body = str(q_item.get("question") or f"Question {q_idx + 1}").strip()
                    parsed_questions.append({
                        "id": q_id,
                        "question": q_body,
                        "is_multi_select": bool(q_item.get("is_multi_select", False)),
                        "options": cls.normalize_question_options(q_item.get("options") or []),
                    })
                question_payload = {
                    "question": q_text,
                    "title": q_text,
                    "is_multi_select": bool(first_q.get("is_multi_select", False)),
                    "options": parsed_questions[0]["options"] if parsed_questions else [],
                    "questions": parsed_questions,
                    "allow_custom_response": True,
                }
        elif name == "run_command":
            verb = "Ran"
            kind = "command"
            cmd_raw = args.get("CommandLine") or ""
            cwd = args.get("Cwd") or ""
            command = cmd_raw
            target = cmd_raw
            summary = args.get("toolSummary") or cmd_raw
            if not summary or summary == cmd_raw:
                summary = "Ran terminal command"
            cwd_parts = re.split(r"[\\/]", cwd) if cwd else []
            cwd_short = "/".join(cwd_parts[-2:]) if len(cwd_parts) >= 2 else cwd
            bypassed = bool(args.get("BypassSandbox", False))
            if not bypassed:
                requires_perm = True
                perm_type = "command"
                perm_title = "Command Approval Required"
                perm_desc = f"Execute command in workspace: `{cmd_raw[:120]}`"

        item_id = f"item-{item_index}"
        step_key = f"{turn_id}-{item_id}"
        resolved_decision = resolved_approvals.get(step_key)

        return {
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
            "allow_custom_response": bool(requires_perm),
            "approval_decision": resolved_decision,
            "question_data": question_payload,
            "status": "done" if (not requires_perm or resolved_decision) else "pending",
        }

