"""Hook dispatcher CLI utility for Antigravity hook scripts and subprocesses."""

import sys
import os
import argparse
import json
from integrations.antigravity.event_parser import parse_environment_metadata
from services.event_ingestion import EventIngestionService
from models.schemas import IngestEventRequest, SourceConfidence
from datetime import datetime, timezone
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("hook_dispatcher")


def dispatch_from_environment() -> int:
    """Read agent execution metadata directly from os.environ and ingest."""
    req = parse_environment_metadata(dict(os.environ))
    if not req:
        logger.info("No Antigravity metadata found in environment variables.")
        return 0

    service = EventIngestionService()
    doc_id, is_dup = service.process_and_store_event(req)
    if is_dup:
        logger.info("Duplicate event ignored: %s", req.source_event_id)
    else:
        logger.info("Successfully ingested event ID %s (%s)", doc_id, req.source_event_id)
    return 0


def dispatch_from_stdin(event_type: str = "PreToolUse") -> int:
    """Read hook JSON payload from stdin."""
    try:
        content = sys.stdin.read().strip()
        if not content:
            logger.info("Empty payload received on stdin.")
            return 0
        payload = json.loads(content)
    except Exception as e:
        logger.error("Failed to parse stdin JSON: %s", str(e))
        return 1

    session_id = payload.get("session_id") or payload.get("conversation_id") or "stdin_session"
    req = IngestEventRequest(
        source_event_id=payload.get("source_event_id")
        or f"{session_id}:{event_type}:{datetime.now(timezone.utc).timestamp()}",
        agent_id=payload.get("agent_id", "antigravity_agent"),
        session_id=session_id,
        task_id=payload.get("task_id"),
        event_type=event_type,
        timestamp=datetime.now(timezone.utc),
        source="antigravity_hook",
        source_confidence=SourceConfidence.OBSERVED,
        raw_payload=payload.get("payload") or payload,
    )

    service = EventIngestionService()
    doc_id, is_dup = service.process_and_store_event(req)
    logger.info("Ingested stdin event: %s (dup=%s)", doc_id, is_dup)
    return 0


def main():
    parser = argparse.ArgumentParser(description="AgentWatch Antigravity Hook Dispatcher")
    parser.add_argument(
        "--from-env",
        action="store_true",
        help="Capture metadata from active subprocess environment",
    )
    parser.add_argument("--event-type", default="PreToolUse", help="Lifecycle hook event type")
    args = parser.parse_args()

    if args.from_env:
        sys.exit(dispatch_from_environment())
    else:
        sys.exit(dispatch_from_stdin(args.event_type))


if __name__ == "__main__":
    main()
