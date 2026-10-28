"""Service to resolve and query session artifacts across Antigravity brain storage."""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class ArtifactsService:
    """Extracts markdown, image, and video artifacts for active and targeted conversations."""

    def __init__(self):
        self.brain_bases = [
            Path.home() / ".gemini" / "antigravity" / "brain",
            Path.home() / ".gemini" / "antigravity-ide" / "brain",
        ]

    def get_session_dir(self, conversation_id: Optional[str] = None) -> Optional[Path]:
        """Resolve active or targeted session directory."""
        if not conversation_id:
            try:
                from integrations.antigravity.adapter import antigravity_adapter
                st = antigravity_adapter.get_status()
                conversation_id = st.get("active_conversation_id")
            except Exception:
                pass

        if conversation_id:
            for b in self.brain_bases:
                cand = b / conversation_id
                if cand.exists() and cand.is_dir():
                    return cand

        # Fallback to most recently modified transcript session
        transcripts = []
        for b in self.brain_bases:
            if b.exists():
                transcripts.extend(list(b.glob("*/.system_generated/logs/transcript*.jsonl")))

        if transcripts:
            transcripts.sort(key=lambda p: p.stat().st_mtime, reverse=True)
            return transcripts[0].parent.parent.parent

        return None

    def list_artifacts(self, conversation_id: Optional[str] = None) -> Dict[str, Any]:
        """List all markdown and media artifacts for a given or active conversation."""
        session_dir = self.get_session_dir(conversation_id)
        if not session_dir or not session_dir.exists():
            return {"artifacts": [], "total": 0, "session_id": None}

        artifacts: List[Dict[str, Any]] = []

        # 1. Parse markdown artifacts (.md) and optional .metadata.json
        for md_file in session_dir.glob("*.md"):
            try:
                st = md_file.stat()
                meta_file = session_dir / f"{md_file.name}.metadata.json"
                meta_info = {}
                if meta_file.exists():
                    try:
                        meta_info = json.loads(meta_file.read_text(encoding="utf-8"))
                    except Exception:
                        pass

                artifacts.append({
                    "id": md_file.stem,
                    "title": md_file.name.replace("_", " ").replace(".md", "").title(),
                    "filename": md_file.name,
                    "path": str(md_file).replace("\\", "/"),
                    "type": "markdown",
                    "summary": meta_info.get("summary", ""),
                    "size_bytes": st.st_size,
                    "mtime": st.st_mtime,
                })
            except Exception:
                continue

        # 2. Parse media artifacts (.png, .jpg, video, etc.) in tempmedia or root
        media_dirs = [session_dir / ".tempmediaStorage", session_dir]
        image_exts = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}
        video_exts = {".mp4", ".webm", ".mov"}
        all_exts = image_exts | video_exts
        seen_paths = {a["path"] for a in artifacts}

        for mdir in media_dirs:
            if not mdir.exists():
                continue
            for file_path in mdir.iterdir():
                if not file_path.is_file():
                    continue
                ext = file_path.suffix.lower()
                normalized_path = str(file_path).replace("\\", "/")
                if ext in all_exts and normalized_path not in seen_paths:
                    try:
                        st = file_path.stat()
                        is_video = ext in video_exts
                        artifact_type = "video" if is_video else "image"
                        size_kb = round(st.st_size / 1024, 1)
                        summary_label = (
                            f"Video artifact ({size_kb} KB)"
                            if is_video
                            else f"Image artifact ({size_kb} KB)"
                        )
                        artifacts.append({
                            "id": file_path.stem,
                            "title": file_path.name,
                            "filename": file_path.name,
                            "path": normalized_path,
                            "type": artifact_type,
                            "summary": summary_label,
                            "size_bytes": st.st_size,
                            "mtime": st.st_mtime,
                        })
                        seen_paths.add(normalized_path)
                    except Exception:
                        continue

        artifacts.sort(key=lambda a: a.get("mtime", 0), reverse=True)
        return {
            "artifacts": artifacts,
            "total": len(artifacts),
            "session_id": session_dir.name,
        }


artifacts_service = ArtifactsService()

