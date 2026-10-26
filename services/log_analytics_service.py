"""
Log File Management and Analytical Aggregation Service.
Parses date-segregated agentwatch_YYYY-MM-DD.log files to provide
operational metrics, HTTP status breakdowns, timeline distributions, and level pie charts.
"""

import os
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional

LOG_DIR = Path(__file__).resolve().parent.parent / "logs"

# Log pattern: 2026-10-26 00:48:01,661 [INFO] [uvicorn.error:103] message...
LOG_LINE_RE = re.compile(
    r"^(?P<date>\d{4}-\d{2}-\d{2})\s+(?P<time>\d{2}:\d{2}:\d{2})(?:,\d+)?\s+\[(?P<level>[A-Z]+)\]\s+\[(?P<logger>[^\]]+)\]\s+(?P<message>.*)$"
)

# HTTP Access log pattern in uvicorn.access: "GET /api/v1/... HTTP/1.1" 200
HTTP_ACCESS_RE = re.compile(
    r'"(?P<method>[A-Z]+)\s+(?P<path>[^\s\?]+)(?:\?[^"]*)?\s+HTTP/[0-9.]+"\s+(?P<status>\d{3})'
)


class LogAnalyticsService:
    """Service providing file browsing and deep analytical metrics across server log files."""

    def __init__(self, log_directory: Optional[Path] = None):
        self.log_dir = log_directory or LOG_DIR
        self.log_dir.mkdir(parents=True, exist_ok=True)

    def list_log_files(self) -> List[Dict[str, Any]]:
        """List all available date-based log files with sizes, dates, and line counts."""
        files = []
        for p in self.log_dir.glob("agentwatch_*.log"):
            if not p.is_file():
                continue
            stat = p.stat()
            # Extract date from filename agentwatch_YYYY-MM-DD.log
            date_str = p.stem.replace("agentwatch_", "")
            files.append({
                "filename": p.name,
                "date": date_str,
                "size_bytes": stat.st_size,
                "modified_time": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "path": str(p).replace("\\", "/")
            })

        # Sort descending by date
        files.sort(key=lambda x: x["date"], reverse=True)
        return files

    def analyze_log_file(self, date_or_filename: str) -> Dict[str, Any]:
        """
        Analyze a specific log file and return comprehensive analytics:
        - Total lines, error count, warning count, info count
        - Pie chart distributions (levels & HTTP status codes)
        - Hourly activity histogram (00-23 hours)
        - Top endpoints requested
        - Top loggers emitting events
        - Recent critical / error excerpts
        """
        target = self._resolve_file(date_or_filename)
        if not target or not target.exists():
            return {
                "error": f"Log file for '{date_or_filename}' not found",
                "filename": date_or_filename,
                "exists": False
            }

        level_counts: Dict[str, int] = {"INFO": 0, "WARNING": 0, "ERROR": 0, "DEBUG": 0, "CRITICAL": 0}
        hourly_distribution: Dict[str, Dict[str, Any]] = {
            f"{h:02d}:00": {
                "total": 0,
                "levels": {"INFO": 0, "WARNING": 0, "ERROR": 0, "DEBUG": 0, "CRITICAL": 0},
                "status": {"2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0}
            }
            for h in range(24)
        }
        status_codes: Dict[str, int] = {"2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0}
        endpoint_counts: Dict[str, int] = {}
        logger_counts: Dict[str, int] = {}
        recent_errors: List[Dict[str, str]] = []

        total_lines = 0
        parsed_entries = 0
        first_timestamp = None
        last_timestamp = None

        try:
            with target.open("r", encoding="utf-8", errors="replace") as f:
                for line in f:
                    total_lines += 1
                    match = LOG_LINE_RE.match(line)
                    if not match:
                        continue

                    parsed_entries += 1
                    data = match.groupdict()
                    lvl = data["level"].upper()
                    level_counts[lvl] = level_counts.get(lvl, 0) + 1

                    time_str = data["time"]
                    hour_bucket = f"{time_str[:2]}:00"
                    if hour_bucket in hourly_distribution:
                        hourly_distribution[hour_bucket]["total"] += 1
                        bucket_levels = hourly_distribution[hour_bucket]["levels"]
                        bucket_levels[lvl] = bucket_levels.get(lvl, 0) + 1

                    if not first_timestamp:
                        first_timestamp = f"{data['date']} {time_str}"
                    last_timestamp = f"{data['date']} {time_str}"

                    # Logger tracking
                    logger_name = data["logger"].split(":")[0]
                    logger_counts[logger_name] = logger_counts.get(logger_name, 0) + 1

                    # Error sample collection (last 15 errors)
                    if lvl in ("ERROR", "CRITICAL"):
                        if len(recent_errors) < 15:
                            recent_errors.append({
                                "time": time_str,
                                "level": lvl,
                                "logger": logger_name,
                                "message": data["message"][:200]
                            })

                    # HTTP Access check
                    if "uvicorn.access" in data["logger"]:
                        http_match = HTTP_ACCESS_RE.search(data["message"])
                        if http_match:
                            hdata = http_match.groupdict()
                            code = int(hdata["status"])
                            sc_key = None
                            if 200 <= code < 300:
                                sc_key = "2xx"
                            elif 300 <= code < 400:
                                sc_key = "3xx"
                            elif 400 <= code < 500:
                                sc_key = "4xx"
                            elif code >= 500:
                                sc_key = "5xx"

                            if sc_key:
                                status_codes[sc_key] += 1
                                if hour_bucket in hourly_distribution:
                                    hourly_distribution[hour_bucket]["status"][sc_key] += 1

                            route = f"{hdata['method']} {hdata['path']}"
                            endpoint_counts[route] = endpoint_counts.get(route, 0) + 1

        except Exception as e:
            return {"error": f"Failed analyzing log: {str(e)}", "filename": target.name}

        # Format top endpoints
        top_endpoints = [
            {"endpoint": k, "count": v}
            for k, v in sorted(endpoint_counts.items(), key=lambda x: x[1], reverse=True)[:8]
        ]

        # Format top loggers
        top_loggers = [
            {"logger": k, "count": v}
            for k, v in sorted(logger_counts.items(), key=lambda x: x[1], reverse=True)[:6]
        ]

        # Calculate percentages for pie chart
        pie_levels = []
        for lvl, cnt in level_counts.items():
            if cnt > 0:
                pct = round((cnt / max(parsed_entries, 1)) * 100, 1)
                pie_levels.append({"level": lvl, "count": cnt, "percentage": pct})

        pie_status = []
        total_http = sum(status_codes.values())
        if total_http > 0:
            for sc, cnt in status_codes.items():
                if cnt > 0:
                    pie_status.append({
                        "category": sc,
                        "count": cnt,
                        "percentage": round((cnt / total_http) * 100, 1)
                    })

        return {
            "exists": True,
            "filename": target.name,
            "date": target.stem.replace("agentwatch_", ""),
            "size_bytes": target.stat().st_size,
            "total_lines": total_lines,
            "parsed_entries": parsed_entries,
            "first_timestamp": first_timestamp,
            "last_timestamp": last_timestamp,
            "level_counts": level_counts,
            "pie_levels": pie_levels,
            "pie_status": pie_status,
            "hourly_timeline": [
                {
                    "hour": h,
                    "count": data["total"],
                    "levels": data["levels"],
                    "status": data["status"]
                }
                for h, data in hourly_distribution.items()
            ],
            "top_endpoints": top_endpoints,
            "top_loggers": top_loggers,
            "recent_errors": recent_errors,
        }

    def delete_log_file(self, date_or_filename: str) -> Dict[str, Any]:
        """
        Safely delete or truncate a log file.
        If it's today's active file, truncate it to 0 bytes to prevent handle locks.
        """
        target = self._resolve_file(date_or_filename)
        if not target or not target.exists():
            return {"success": False, "error": f"Log file '{date_or_filename}' not found."}

        today_str = datetime.now().strftime("%Y-%m-%d")
        is_today = today_str in target.name

        try:
            if is_today:
                # Active log file: truncate safely without breaking active file descriptors
                with target.open("w", encoding="utf-8") as f:
                    f.truncate(0)
                return {
                    "success": True,
                    "filename": target.name,
                    "action": "truncated",
                    "message": f"Active file '{target.name}' truncated successfully."
                }
            else:
                target.unlink(missing_ok=True)
                return {
                    "success": True,
                    "filename": target.name,
                    "action": "deleted",
                    "message": f"Log file '{target.name}' deleted successfully."
                }
        except Exception as e:
            return {"success": False, "error": str(e), "filename": target.name}

    def _resolve_file(self, date_or_filename: str) -> Optional[Path]:
        """Resolve a filename or date string safely inside the log directory."""
        clean = Path(date_or_filename).name
        if not clean.endswith(".log"):
            candidate = self.log_dir / f"agentwatch_{clean}.log"
            if candidate.exists():
                return candidate
        candidate = self.log_dir / clean
        if candidate.exists() and candidate.is_file():
            return candidate
        return None


log_analytics_service = LogAnalyticsService()

