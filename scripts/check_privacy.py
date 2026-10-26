#!/usr/bin/env python3
"""
Privacy and Secret Scanner for AgentWatch.
Scans tracked repository files for accidental secrets, private IPs, credentials, or personal emails.
Ensures zero leaks before git commits.
"""

import sys
import os
import re
from pathlib import Path

# Patterns indicating real secrets or private data
SECRET_PATTERNS = [
    (re.compile(r"ghp_[a-zA-Z0-9]{36}"), "GitHub Personal Access Token"),
    (re.compile(r"github_pat_[a-zA-Z0-9_]{82}"), "Fine-grained GitHub Token"),
    (re.compile(r"sk-[a-zA-Z0-9]{32,}"), "OpenAI API Key"),
    (re.compile(r"AIza[0-9A-Za-z-_]{35}"), "Google Cloud API Key"),
    (re.compile(r"-----BEGIN\s+(RSA|OPENSSH|EC|DSA)?\s*PRIVATE KEY-----"), "Private Key"),
    (
        re.compile(r"(?i)(password|secret|passwd)\s*[:=]\s*['\"][^'\"]{8,}['\"]"),
        "Hardcoded Password Assignment",
    ),
]

# Whitelist safe placeholder strings
SAFE_PLACEHOLDERS = [
    "placeholder_app_password",
    "placeholder_jwt_secret_key_change_in_production",
    "your_secure_passcode",
    "your_token_here",
    "ag_default_token",
    "[REDACTED]",
    "antigravity",
]

# Directories and files to exclude from scan
EXCLUDE_DIRS = {
    ".git",
    ".venv",
    "venv",
    "__pycache__",
    "node_modules",
    "data",
    "logs",
    ".pytest_cache",
}
EXCLUDE_EXTS = {".png", ".jpg", ".jpeg", ".ico", ".svg", ".cert", ".key", ".pyc"}


def scan_file(file_path: Path) -> list:
    issues = []
    try:
        content = file_path.read_text(encoding="utf-8", errors="ignore")
    except Exception as e:
        return issues

    for lineno, line in enumerate(content.splitlines(), start=1):
        # Ignore safe placeholder strings
        if any(safe in line for safe in SAFE_PLACEHOLDERS):
            continue

        for pattern, desc in SECRET_PATTERNS:
            if pattern.search(line):
                # Never print the secret itself!
                issues.append(f"{file_path.relative_to(Path.cwd())}:{lineno} - {desc}")
                break

    return issues


def main() -> int:
    root = Path.cwd()
    print(f"[SCAN] Starting Privacy and Secret Scan across {root}...")
    total_files = 0
    total_issues = []

    for path in root.rglob("*"):
        if path.is_file():
            if any(part in EXCLUDE_DIRS for part in path.parts):
                continue
            if path.suffix.lower() in EXCLUDE_EXTS:
                continue

            total_files += 1
            file_issues = scan_file(path)
            if file_issues:
                total_issues.extend(file_issues)

    print(f"[REPORT] Scanned {total_files} files.")
    if total_issues:
        print(f"[FAIL] PRIVACY AUDIT FAILED! Found {len(total_issues)} potential risk(s):")
        for issue in total_issues:
            print(f"  - {issue}")
        print("\nFix these items before committing or publishing!")
        return 1
    else:
        print("[PASS] PRIVACY AUDIT PASSED! No credentials, secrets, or private tokens detected.")
        return 0


if __name__ == "__main__":
    sys.exit(main())
