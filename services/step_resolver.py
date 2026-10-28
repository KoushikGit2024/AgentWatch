"""Service to resolve full, untruncated step outputs from Antigravity session storage."""

import logging
import re
from pathlib import Path
from typing import Optional, Union

logger = logging.getLogger(__name__)

# Matches file:///path/to/.system_generated/steps/<step_index>/output.txt
# or relative .system_generated/steps/<step_index>/output.txt
STEP_FILE_PATTERN = re.compile(
    r"(?:file:///|file://)?([a-zA-Z]:[\\/][^\s\"'<>]+?[\\/]\.system_generated[\\/]steps[\\/](\d+)[\\/]output\.txt)",
    re.IGNORECASE,
)
STEP_INDEX_PATTERN = re.compile(
    r"\.system_generated[\\/]steps[\\/](\d+)[\\/]output\.txt",
    re.IGNORECASE,
)


class StepOutputResolver:
    """
    Extracts untruncated terminal or tool outputs directly from Antigravity's
    `.system_generated/steps/<step_index>/output.txt` files.
    """

    def __init__(self, max_bytes: int = 1_000_000):
        self.max_bytes = max_bytes

    def resolve_output(
        self,
        content: Optional[str],
        session_dir: Optional[Union[Path, str]] = None,
    ) -> Optional[str]:
        """
        Check if content contains a step output truncation notice.
        If found, read and return the genuine, complete output from disk.
        Otherwise, return the original content unchanged.
        """
        if not content or "output.txt" not in content:
            return content

        target_file: Optional[Path] = None

        # 1. Try matching absolute file URI / path
        match = STEP_FILE_PATTERN.search(content)
        if match:
            raw_path = match.group(1).replace("/", "\\")
            cand = Path(raw_path)
            if cand.exists() and cand.is_file():
                target_file = cand

        # 2. Try matching step index and resolving against session_dir
        if not target_file and session_dir:
            idx_match = STEP_INDEX_PATTERN.search(content)
            if idx_match:
                step_idx = idx_match.group(1)
                cand = (
                    Path(session_dir)
                    / ".system_generated"
                    / "steps"
                    / step_idx
                    / "output.txt"
                )
                if cand.exists() and cand.is_file():
                    target_file = cand

        if not target_file:
            return content

        try:
            # Read up to max_bytes with graceful error handling
            with open(target_file, "r", encoding="utf-8", errors="replace") as f:
                full_text = f.read(self.max_bytes)

            # Extract clean stdout/stderr if wrapper banner exists
            clean_text = self._extract_clean_command_output(full_text)
            return clean_text if clean_text else full_text
        except Exception as e:
            logger.debug("Failed to read step output from %s: %s", target_file, e)
            return content

    def _extract_clean_command_output(self, raw_text: str) -> str:
        """Strip IDE wrapper headers (e.g. Created At / Command Output) if present."""
        if not raw_text:
            return ""

        marker = "Command output:\n"
        if marker in raw_text:
            return raw_text.split(marker, 1)[1].strip()

        alt_marker = "Output:\n"
        if alt_marker in raw_text:
            return raw_text.split(alt_marker, 1)[1].strip()

        return raw_text.strip()


step_output_resolver = StepOutputResolver()

