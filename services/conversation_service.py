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

    def get_recent_conversation(self, limit: int = 40) -> List[Dict[str, Any]]:
        """
        Parse the active Antigravity transcript into clean conversational turns:
        - User prompts with clean extracted text
        - Agent tool execution steps (grouped collapsibles)
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
                        created_at = step.get("created_at")

                        if stype == "USER_INPUT" and content:
                            # Strip IDE internal protocol tags
                            clean = re.sub(r"<USER_REQUEST>\s*", "", content)
                            clean = re.sub(r"</USER_REQUEST>.*", "", clean, flags=re.DOTALL).strip()
                            # Strip user state/metadata header if present
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
                                    "tools": [],
                                    "timestamp": created_at
                                }
                            if tools:
                                for t in tools:
                                    summary = t.get("toolSummary") or t.get("toolAction") or t.get("name")
                                    current_agent_turn["tools"].append({
                                        "name": t.get("name"),
                                        "summary": summary
                                    })
                            if content:
                                current_agent_turn["text"] = content

                    except Exception:
                        continue

            if current_agent_turn:
                turns.append(current_agent_turn)

        except Exception:
            return []

        return turns[-limit:]


conversation_service = ConversationService()
