"""Idempotency repository backed by MongoDB with payload fingerprinting and concurrency safety."""

import hashlib
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, Tuple
from pymongo.collection import Collection
from pymongo.errors import DuplicateKeyError, PyMongoError
from config.database import get_database

logger = logging.getLogger("repositories.idempotency")


def compute_payload_fingerprint(payload: Any) -> str:
    """Compute deterministic SHA-256 fingerprint of request payload."""
    try:
        if hasattr(payload, "model_dump"):
            data = payload.model_dump()
        elif isinstance(payload, dict):
            data = payload
        else:
            data = str(payload)

        if isinstance(data, dict):
            # Omit None keys and empty collections to normalize differences between raw dicts and Pydantic models with default fields
            cleaned = {k: v for k, v in data.items() if v is not None and v != []}
            serialized = json.dumps(cleaned, sort_keys=True, default=str)
        else:
            serialized = str(data)
    except Exception:
        serialized = str(payload)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


class IdempotencyRepository:
    """
    Manages persistent idempotency records with unique database constraints.
    Prevents duplicate execution, detects key reuse with mismatched payloads,
    and coordinates cross-request concurrency atomically.
    """

    def __init__(self, db=None):
        self._db = db if db is not None else get_database()
        self.collection: Collection = self._db.idempotency_keys
        self._fallback_store: Dict[str, Dict[str, Any]] = {}

    def reserve_or_get(
        self, scope: str, idempotency_key: str, payload: Any, ttl_minutes: int = 1440
    ) -> Tuple[str, Optional[Dict[str, Any]]]:
        """
        Attempt to atomically reserve an idempotency key or retrieve existing outcome.
        Falls back to in-memory idempotency tracking if MongoDB is disconnected/unreachable.
        """
        fingerprint = compute_payload_fingerprint(payload)
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(minutes=ttl_minutes)

        record = {
            "scope": scope,
            "idempotency_key": idempotency_key,
            "fingerprint": fingerprint,
            "status": "in_progress",
            "response": None,
            "created_at": now,
            "updated_at": now,
            "expires_at": expires_at,
        }

        try:
            self.collection.insert_one(record)
            return "reserved", None
        except DuplicateKeyError:
            # Key already exists; inspect existing record
            try:
                existing = self.collection.find_one(
                    {"scope": scope, "idempotency_key": idempotency_key}
                )
            except Exception:
                existing = self._fallback_store.get(f"{scope}:{idempotency_key}")

            if not existing:
                return "reserved", None

            if existing.get("fingerprint") != fingerprint:
                logger.warning(
                    "Idempotency key '%s' in scope '%s' reused with mismatched payload fingerprint.",
                    idempotency_key,
                    scope,
                )
                return "conflict_mismatch", None

            if existing.get("status") == "completed":
                return "completed", existing.get("response")

            return "in_progress", None
        except (PyMongoError, Exception) as exc:
            logger.warning(
                "MongoDB unavailable during idempotency reservation (%s). Using in-memory fallback.",
                str(exc),
            )
            composite_key = f"{scope}:{idempotency_key}"
            existing = self._fallback_store.get(composite_key)
            if existing:
                if existing.get("fingerprint") != fingerprint:
                    return "conflict_mismatch", None
                if existing.get("status") == "completed":
                    return "completed", existing.get("response")
                return "in_progress", None

            self._fallback_store[composite_key] = record
            return "reserved", None

    def complete(self, scope: str, idempotency_key: str, response: Dict[str, Any]) -> bool:
        """Atomically transition state from in_progress to completed with stored response."""
        now = datetime.now(timezone.utc)
        composite_key = f"{scope}:{idempotency_key}"
        if composite_key in self._fallback_store:
            self._fallback_store[composite_key]["status"] = "completed"
            self._fallback_store[composite_key]["response"] = response
            self._fallback_store[composite_key]["updated_at"] = now

        try:
            res = self.collection.update_one(
                {"scope": scope, "idempotency_key": idempotency_key},
                {
                    "$set": {
                        "status": "completed",
                        "response": response,
                        "updated_at": now,
                    }
                },
            )
            return res.modified_count > 0 or composite_key in self._fallback_store
        except (PyMongoError, Exception) as exc:
            logger.warning(
                "MongoDB unavailable during idempotency completion (%s). Updated in-memory fallback.",
                str(exc),
            )
            if composite_key in self._fallback_store:
                self._fallback_store[composite_key]["status"] = "completed"
                self._fallback_store[composite_key]["response"] = response
                return True
            return False

    def fail(self, scope: str, idempotency_key: str, error_detail: Optional[str] = None) -> bool:
        """Release or mark failed reservation so future retries can succeed if appropriate."""
        now = datetime.now(timezone.utc)
        composite_key = f"{scope}:{idempotency_key}"
        if composite_key in self._fallback_store:
            self._fallback_store[composite_key]["status"] = "failed"
            self._fallback_store[composite_key]["error"] = error_detail

        try:
            res = self.collection.update_one(
                {"scope": scope, "idempotency_key": idempotency_key},
                {
                    "$set": {
                        "status": "failed",
                        "error": error_detail,
                        "updated_at": now,
                    }
                },
            )
            return res.modified_count > 0 or composite_key in self._fallback_store
        except (PyMongoError, Exception) as exc:
            logger.warning("MongoDB unavailable during idempotency failure update (%s).", str(exc))
            return composite_key in self._fallback_store

    def mark_outcome_unknown(self, scope: str, idempotency_key: str, reason: str) -> bool:
        """
        Transition an operation to outcome_unknown when external dispatch was attempted
        but completion could not be verified.
        """
        now = datetime.now(timezone.utc)
        safe_extended_expiry = now + timedelta(days=7)
        composite_key = f"{scope}:{idempotency_key}"
        if composite_key in self._fallback_store:
            self._fallback_store[composite_key]["status"] = "outcome_unknown"
            self._fallback_store[composite_key]["reason"] = reason

        try:
            res = self.collection.update_one(
                {"scope": scope, "idempotency_key": idempotency_key},
                {
                    "$set": {
                        "status": "outcome_unknown",
                        "reason": reason,
                        "metadata.outcome_reason": reason,
                        "updated_at": now,
                        "expires_at": safe_extended_expiry,
                    }
                },
            )
            return res.modified_count > 0 or composite_key in self._fallback_store
        except (PyMongoError, Exception) as exc:
            logger.warning("MongoDB unavailable during outcome_unknown transition (%s).", str(exc))
            return composite_key in self._fallback_store
