"""Authentication and session cookie protection for AgentWatch."""

import hmac
import hashlib
from typing import Optional
from fastapi import Request, HTTPException, status
from config.settings import settings

AUTH_COOKIE_NAME = "cw_auth_token"


def generate_session_token(password: str) -> str:
    """Generate deterministic HMAC signature for valid authentication password."""
    return hmac.new(
        settings.jwt_secret.encode("utf-8"),
        password.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()


def verify_session_token(token: str) -> bool:
    """Verify if the token matches the configured APP_PASSWORD signature."""
    expected = generate_session_token(settings.app_password)
    return hmac.compare_digest(token, expected)


def is_local_request(request: Request) -> bool:
    """
    Check if the request originates from loopback or local LAN.
    Note: Remote access via Tailscale will carry the tailnet IP.
    """
    client_host = request.client.host if request.client else ""
    return client_host in ("127.0.0.1", "::1", "localhost", "testclient")


def check_auth_required(request: Request) -> bool:
    """
    Determine if authentication is required for the request.
    If APP_PASSWORD is empty, auth is disabled.
    Local requests from loopback (127.0.0.1, testclient) are permitted, preserving
    local headless access while external Tailscale access requires password verification.
    """
    if not settings.app_password:
        return False
    
    if is_local_request(request):
        return False

    # Check Cookie
    cookie_token = request.cookies.get(AUTH_COOKIE_NAME)
    if cookie_token and verify_session_token(cookie_token):
        return False
    
    # Check Bearer Header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        if verify_session_token(token):
            return False

    return True
