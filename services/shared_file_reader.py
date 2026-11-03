"""Utility for non-exclusive, shared-read file access on Windows & POSIX.

Prevents PermissionError: [WinError 32] when reading active transcripts
and tool logs while the host IDE process is actively writing to them.
"""

import os
import sys
import time
import logging
from pathlib import Path
from typing import Generator, Union, Optional

logger = logging.getLogger(__name__)


def open_shared_read(file_path: Union[str, Path], encoding: str = "utf-8", max_retries: int = 3, retry_delay: float = 0.05):
    """
    Open a file for reading with shared read/write access.
    On Windows, uses os.O_RDONLY with shared access semantics.
    Retries up to max_retries with a brief sleep if a temporary file lock is encountered.
    """
    target = Path(file_path)
    last_err = None

    for attempt in range(max_retries):
        try:
            if sys.platform == "win32":
                # On Windows, os.open with O_RDONLY allows shared read access with writers
                fd = os.open(str(target), os.O_RDONLY | getattr(os, "O_BINARY", 0))
                return open(fd, mode="r", encoding=encoding, errors="replace", closefd=True)
            else:
                return open(target, mode="r", encoding=encoding, errors="replace")
        except PermissionError as pe:
            last_err = pe
            time.sleep(retry_delay * (attempt + 1))
        except Exception as e:
            last_err = e
            break

    logger.warning("Shared read failed for %s after %d retries: %s", target, max_retries, last_err)
    raise last_err if last_err else IOError(f"Could not open {target}")

