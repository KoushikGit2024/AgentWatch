"""Web Push notification service for AgentWatch.
Handles VAPID keypair generation, subscriber management, and push dispatch.
"""

import json
import logging
import os
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger("agentwatch.push")

try:
    from py_vapid import Vapid
    from pywebpush import webpush, WebPushException
    PYWEBPUSH_AVAILABLE = True
except ImportError:
    PYWEBPUSH_AVAILABLE = False
    logger.warning("pywebpush or py-vapid not installed; Web Push dispatch disabled.")


class WebPushService:
    def __init__(self, storage_dir: Optional[Path] = None):
        self.storage_dir = storage_dir or Path("data")
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.vapid_private_path = self.storage_dir / "vapid_private.pem"
        self.vapid_public_path = self.storage_dir / "vapid_public.txt"
        self.subs_path = self.storage_dir / "push_subscriptions.json"
        self._ensure_vapid_keys()

    def _ensure_vapid_keys(self):
        """Generate and save VAPID keys if they do not exist."""
        if not PYWEBPUSH_AVAILABLE:
            return

        if not self.vapid_private_path.exists() or not self.vapid_public_path.exists():
            try:
                vapid = Vapid()
                vapid.generate_keys()
                # Save private key PEM
                with open(self.vapid_private_path, "wb") as f:
                    f.write(vapid.private_pem())

                # Save raw URL-safe base64 public key (uncompressed point, 65 bytes) for browser applicationServerKey
                from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
                import base64
                raw_pub = vapid.public_key.public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)
                b64_pub = base64.urlsafe_b64encode(raw_pub).rstrip(b'=').decode('utf-8')
                with open(self.vapid_public_path, "w", encoding="utf-8") as f:
                    f.write(b64_pub)
                logger.info("Generated fresh VAPID keys for Web Push.")
            except Exception as e:
                logger.error("Failed to generate VAPID keys: %s", str(e))

    def get_public_key(self) -> Optional[str]:
        """Return base64 applicationServerKey for frontend push registration."""
        if self.vapid_public_path.exists():
            try:
                return self.vapid_public_path.read_text(encoding="utf-8").strip()
            except Exception:
                return None
        return None

    def _load_subscriptions(self) -> List[Dict[str, Any]]:
        if not self.subs_path.exists():
            return []
        try:
            with open(self.subs_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

    def _save_subscriptions(self, subs: List[Dict[str, Any]]):
        try:
            with open(self.subs_path, "w", encoding="utf-8") as f:
                json.dump(subs, f, indent=2)
        except Exception as e:
            logger.error("Failed to save push subscriptions: %s", str(e))

    def add_subscription(self, subscription_info: Dict[str, Any]) -> bool:
        """Add or update a push subscription object."""
        endpoint = subscription_info.get("endpoint")
        if not endpoint:
            return False

        subs = self._load_subscriptions()
        subs = [s for s in subs if s.get("endpoint") != endpoint]
        subs.append(subscription_info)
        self._save_subscriptions(subs)
        logger.info("Added push subscription: %s... (Total: %d)", endpoint[:35], len(subs))
        return True

    def remove_subscription(self, endpoint: str) -> bool:
        """Remove a push subscription by endpoint."""
        subs = self._load_subscriptions()
        initial_len = len(subs)
        subs = [s for s in subs if s.get("endpoint") != endpoint]
        if len(subs) != initial_len:
            self._save_subscriptions(subs)
            return True
        return False

    def send_notification(
        self,
        title: str,
        body: str,
        tag: Optional[str] = None,
        url: str = "/",
        data: Optional[Dict[str, Any]] = None,
        ttl: int = 3600
    ) -> int:
        """
        Send a web push message to all active subscriptions.
        Returns the count of successfully notified clients.
        """
        if not PYWEBPUSH_AVAILABLE or not self.vapid_private_path.exists():
            logger.warning("Cannot send Web Push: VAPID or pywebpush unavailable.")
            return 0

        subs = self._load_subscriptions()
        if not subs:
            return 0

        payload = json.dumps({
            "title": title,
            "body": body,
            "tag": tag or "agentwatch-alert",
            "url": url,
            "data": data or {},
        })

        success_count = 0
        stale_endpoints = []

        vapid_claims = {
            "sub": "mailto:admin@agentwatch.local",
        }

        for sub in subs:
            endpoint = sub.get("endpoint")
            try:
                webpush(
                    subscription_info=sub,
                    data=payload,
                    vapid_private_key=str(self.vapid_private_path),
                    vapid_claims=vapid_claims,
                    ttl=ttl,
                )
                success_count += 1
            except WebPushException as ex:
                status_code = getattr(ex.response, "status_code", None) if hasattr(ex, "response") else None
                # 404 Not Found or 410 Gone means device unsubscribed
                if status_code in (404, 410):
                    stale_endpoints.append(endpoint)
                else:
                    logger.debug("WebPush delivery failure (%s): %s", str(status_code), str(ex))
            except Exception as e:
                logger.debug("WebPush send error to %s: %s", endpoint[:30], str(e))

        if stale_endpoints:
            subs = [s for s in subs if s.get("endpoint") not in stale_endpoints]
            self._save_subscriptions(subs)
            logger.info("Purged %d stale push subscriptions.", len(stale_endpoints))

        return success_count


web_push_service = WebPushService()
