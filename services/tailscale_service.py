"""Tailscale Port Forwarding and Private Mesh Routing Engine."""

import json
import logging
import re
import shutil
import subprocess
from typing import Any, Dict, List, Optional

logger = logging.getLogger("services.tailscale_service")


class TailscalePortForwardService:
    """Manages dynamic multi-port forwarding using Tailscale Serve (Option A: Port-Based Routing)."""

    def __init__(self):
        self.tailscale_path = (
            shutil.which("tailscale") or r"C:\Program Files\Tailscale\tailscale.exe"
        )

    def is_tailscale_installed(self) -> bool:
        """Check if tailscale binary is present on system PATH or standard location."""
        return (
            shutil.which("tailscale") is not None
            or shutil.which(self.tailscale_path) is not None
        )

    def get_status(self) -> Dict[str, Any]:
        """
        Query Tailscale connection, hostname, and verify the Funnel disabled invariant.
        """
        if not self.is_tailscale_installed():
            return {
                "installed": False,
                "connected": False,
                "funnel_disabled_verified": True,
                "mode": "inactive",
                "message": "Tailscale CLI not found on system PATH",
            }

        connected = False
        tailnet_name = None
        devices_detected = 0

        try:
            res = subprocess.run(
                [self.tailscale_path, "status", "--json"],
                capture_output=True,
                text=True,
                timeout=3,
            )
            if res.returncode == 0:
                data = json.loads(res.stdout)
                connected = data.get("BackendState") == "Running"
                self_node = data.get("Self", {})
                tailnet_name = self_node.get("DNSName", "").rstrip(".")
                peers = data.get("Peer", {})
                devices_detected = len(peers)
        except Exception as exc:
            logger.warning("Tailscale status query error: %s", str(exc))

        # Funnel must NEVER be active
        funnel_active = False
        try:
            res = subprocess.run(
                [self.tailscale_path, "funnel", "status"],
                capture_output=True,
                text=True,
                timeout=3,
            )
            if res.returncode == 0 and res.stdout.strip():
                out = res.stdout.lower()
                if "funnel is on" in out or "public" in out:
                    funnel_active = True
        except Exception:
            pass

        return {
            "installed": True,
            "connected": connected,
            "tailnet_hostname": tailnet_name,
            "devices_detected": devices_detected,
            "funnel_active": funnel_active,
            "funnel_disabled_verified": not funnel_active,
            "mode": "tailscale_serve_private",
        }

    def list_forwards(self) -> List[Dict[str, Any]]:
        """
        Parse `tailscale serve status --json` to list all currently active port forwards.
        """
        if not self.is_tailscale_installed():
            return []

        try:
            res = subprocess.run(
                [self.tailscale_path, "serve", "status", "--json"],
                capture_output=True,
                text=True,
                timeout=4,
            )
            if res.returncode != 0 or not res.stdout.strip():
                return []

            data = json.loads(res.stdout)
            web_entries = data.get("Web", {})
            forwards = []

            for host_port_key, web_info in web_entries.items():
                # Format: "lenovo.taila97291.ts.net:5173" or "lenovo.taila97291.ts.net:443"
                parts = host_port_key.rsplit(":", 1)
                host = parts[0]
                ext_port = int(parts[1]) if len(parts) > 1 else 443

                handlers = web_info.get("Handlers", {})
                root_handler = handlers.get("/", {})
                target_proxy = root_handler.get("Proxy", "")

                # Extract target local port
                local_port = None
                port_match = re.search(r":(\d+)", target_proxy)
                if port_match:
                    local_port = int(port_match.group(1))

                url = (
                    f"https://{host}"
                    if ext_port == 443
                    else f"https://{host}:{ext_port}"
                )

                forwards.append(
                    {
                        "external_port": ext_port,
                        "local_port": local_port,
                        "local_target": target_proxy,
                        "url": url,
                        "is_primary": (ext_port == 443),
                        "label": "AgentWatch Dashboard"
                        if ext_port == 443
                        else f"Port {local_port}",
                    }
                )

            # Sort: primary first, then by external port number
            forwards.sort(key=lambda x: (not x["is_primary"], x["external_port"]))
            return forwards
        except Exception as exc:
            logger.error("Failed to list tailscale port forwards: %s", str(exc))
            return []

    def add_forward(
        self,
        local_port: int,
        external_port: Optional[int] = None,
        label: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Forward a local port over Tailnet HTTPS.
        Executes: `tailscale serve --bg --https=<external_port> http://127.0.0.1:<local_port>`
        """
        if not self.is_tailscale_installed():
            return {"success": False, "error": "Tailscale is not installed."}

        # Safe port validation (1024 - 65535)
        if not (1024 <= local_port <= 65535):
            return {
                "success": False,
                "error": f"Local port {local_port} is invalid. Allowed range: 1024 - 65535.",
            }

        target_ext_port = external_port or local_port
        if not (1024 <= target_ext_port <= 65535):
            return {
                "success": False,
                "error": f"External port {target_ext_port} is invalid. Allowed range: 1024 - 65535.",
            }

        cmd = [
            self.tailscale_path,
            "serve",
            "--bg",
            f"--https={target_ext_port}",
            f"http://127.0.0.1:{local_port}",
        ]

        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=8)
            if res.returncode != 0:
                err = res.stderr.strip() or res.stdout.strip()
                return {
                    "success": False,
                    "error": f"Tailscale serve command failed: {err}",
                }

            # Refresh list to obtain generated URL
            active_list = self.list_forwards()
            matched = next(
                (f for f in active_list if f["external_port"] == target_ext_port),
                None,
            )

            return {
                "success": True,
                "external_port": target_ext_port,
                "local_port": local_port,
                "label": label or f"Port {local_port}",
                "url": matched["url"] if matched else None,
                "item": matched,
            }
        except Exception as exc:
            logger.error("Failed to add tailscale forward: %s", str(exc))
            return {"success": False, "error": str(exc)}

    def remove_forward(self, external_port: int) -> Dict[str, Any]:
        """
        Remove a specific served port.
        Executes: `tailscale serve --https=<external_port> off`
        Safeguard: Prevents removing port 443 (primary AgentWatch server).
        """
        if not self.is_tailscale_installed():
            return {"success": False, "error": "Tailscale is not installed."}

        if external_port == 443:
            return {
                "success": False,
                "error": "Port 443 is reserved for the primary AgentWatch server and cannot be removed.",
            }

        cmd = [self.tailscale_path, "serve", f"--https={external_port}", "off"]

        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=6)
            if res.returncode != 0:
                err = res.stderr.strip() or res.stdout.strip()
                return {
                    "success": False,
                    "error": f"Failed to stop port {external_port}: {err}",
                }

            return {
                "success": True,
                "removed_port": external_port,
                "message": f"Port {external_port} forward stopped successfully.",
            }
        except Exception as exc:
            logger.error(
                "Failed to remove tailscale forward on port %s: %s",
                external_port,
                str(exc),
            )
            return {"success": False, "error": str(exc)}


tailscale_service = TailscalePortForwardService()

