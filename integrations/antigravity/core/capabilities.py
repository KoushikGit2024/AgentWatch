"""Antigravity integration capabilities declaration and truthfulness matrix."""

from pydantic import BaseModel
from typing import Dict, Any


class AntigravityCapabilities(BaseModel):
    """
    Truthful capability matrix reflecting verified Antigravity integration mechanisms.
    Never claims unsupported automatic hooks or simulated permission bypass.
    """

    read_only_observation: bool = True
    environment_metadata_capture: bool = True
    cdp_debugging_port_monitoring: bool = True
    cdp_snapshot_mirroring: bool = True
    automatic_native_hook_injection: bool = (
        False  # Platform limitation: hooks requires workspace initialization / reload
    )
    # Security boundaries & execution semantics:
    # Arbitrary unverified remote shell is strictly disabled. Terminal actions execute only within authorized workspaces.
    remote_shell_execution: bool = False  # Arbitrary unsandboxed remote shell disabled; workspace terminal tasks supported
    # Native OS / IDE security dialogs remain authoritative; remote clicks cannot bypass system security barriers.
    submit_approval_decisions: bool = False  # Simulated permission bypass disabled; CDP modal forwarding operates with exact button scoring
    public_internet_exposure: bool = (
        False  # Non-negotiable: Funnel disabled, Tailscale tailnet only
    )


def get_verified_capabilities() -> Dict[str, Any]:
    """Return verified capabilities dictionary."""
    return AntigravityCapabilities().model_dump()
