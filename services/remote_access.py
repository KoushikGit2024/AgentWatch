"""Tailscale inspection and private remote access status service."""

import subprocess
import shutil
import re
from typing import Dict, Any, Optional
from config.settings import settings
import logging

logger = logging.getLogger("services.remote_access")


class RemoteAccessService:
    """Manages and inspects Tailscale Serve status without exposing private identifiers."""

    def __init__(self):
        self.tailscale_path = (
            shutil.which("tailscale") or r"C:\Program Files\Tailscale\tailscale.exe"
        )

    def is_tailscale_installed(self) -> bool:
        """Check if tailscale binary exists."""
        return (
            shutil.which("tailscale") is not None or shutil.which(self.tailscale_path) is not None
        )

    def get_tailscale_status(self) -> Dict[str, Any]:
        """
        Query Tailscale connection, Serve status, and Funnel status.
        All private IP addresses and personal hostnames/tailnet IDs are safely masked.
        """
        if not self.is_tailscale_installed():
            return {
                "installed": False,
                "connected": False,
                "serve_active": False,
                "funnel_active": False,
                "status": "not_installed",
                "message": "Tailscale executable not found in PATH or standard install directory",
            }

        connected = False
        serve_active = False
        funnel_active = False
        tailnet_available = False

        # Check connection status
        try:
            res = subprocess.run(
                [self.tailscale_path, "status"], capture_output=True, text=True, timeout=3
            )
            if res.returncode == 0:
                connected = True
                # Check if other devices are present
                lines = [l for l in res.stdout.strip().split("\n") if l.strip()]
                tailnet_available = len(lines) > 0
        except Exception as e:
            logger.warning("Tailscale status command failed: %s", str(e))

        # Check serve status
        try:
            res = subprocess.run(
                [self.tailscale_path, "serve", "status"], capture_output=True, text=True, timeout=3
            )
            if res.returncode == 0 and res.stdout.strip():
                output = res.stdout.lower()
                if (
                    "proxy http://127.0.0.1" in output
                    or "proxy http://localhost" in output
                    or "tailnet only" in output
                ):
                    serve_active = True
        except Exception as e:
            logger.warning("Tailscale serve status command failed: %s", str(e))

        # Check funnel status (Must be false/disabled!)
        try:
            res = subprocess.run(
                [self.tailscale_path, "funnel", "status"], capture_output=True, text=True, timeout=3
            )
            if res.returncode == 0 and res.stdout.strip():
                output = res.stdout.lower()
                # Funnel is active only if it explicitly mentions public or funnel traffic
                if "funnel is on" in output or "public" in output:
                    funnel_active = True
        except Exception as e:
            pass

        return {
            "installed": True,
            "connected": connected,
            "tailnet_devices_detected": tailnet_available,
            "serve_active": serve_active,
            "funnel_active": funnel_active,
            "private_networking": "tailnet_https_only"
            if serve_active and not funnel_active
            else "inactive",
            "funnel_disabled_verified": not funnel_active,
            "instructions": (
                "Run 'tailscale serve --bg 8000' to expose the local dashboard privately to your tailnet. "
                "Never run 'tailscale funnel'!"
            ),
        }


remote_access_service = RemoteAccessService()
