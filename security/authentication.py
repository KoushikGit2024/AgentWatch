"""Authentication, session security, and rate limiting for AgentWatch."""

import hmac
import hashlib
import secrets
import time
from typing import Optional, Dict
from fastapi import Request
from config.settings import settings

AUTH_COOKIE_NAME = "cw_auth_token"

# In-memory session store: token -> expiry timestamp
_ACTIVE_SESSIONS: Dict[str, float] = {}

# Sliding window login rate limiter: client_ip -> list of failure timestamps
_LOGIN_FAILURES: Dict[str, list[float]] = {}
MAX_LOGIN_ATTEMPTS = 5
LOGIN_WINDOW_SECONDS = 60.0
SESSION_TTL_SECONDS = 30 * 24 * 3600.0  # 30 days


def generate_session_token(password: str) -> str:
    """
    Generate a cryptographically secure random session token.
    Registers the token in the server-side session registry with TTL.
    """
    token = secrets.token_urlsafe(32)
    _ACTIVE_SESSIONS[token] = time.time() + SESSION_TTL_SECONDS
    return token


def verify_session_token(token: str) -> bool:
    """
    Verify if the token is a currently active, non-expired session token.
    Maintains backward compatibility with legacy HMAC tokens during rolling upgrade.
    """
    if not token or not isinstance(token, str):
        return False

    # 1. Check in-memory random session token
    now = time.time()
    expiry = _ACTIVE_SESSIONS.get(token)
    if expiry is not None:
        if now < expiry:
            return True
        else:
            _ACTIVE_SESSIONS.pop(token, None)
            return False

    # 2. Timing-safe verification for legacy HMAC password signature
    if settings.app_password:
        legacy_expected = hmac.new(
            settings.jwt_secret.encode("utf-8"),
            settings.app_password.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        if hmac.compare_digest(token, legacy_expected):
            return True

    return False


def revoke_session_token(token: str) -> bool:
    """Revoke an active session token immediately upon logout."""
    if token in _ACTIVE_SESSIONS:
        del _ACTIVE_SESSIONS[token]
        return True
    return False


def is_login_rate_limited(client_ip: str) -> bool:
    """Check if the client IP has exceeded maximum allowed failed attempts."""
    now = time.time()
    failures = _LOGIN_FAILURES.get(client_ip, [])
    # Filter failures within the sliding window
    valid_failures = [t for t in failures if now - t < LOGIN_WINDOW_SECONDS]
    _LOGIN_FAILURES[client_ip] = valid_failures
    return len(valid_failures) >= MAX_LOGIN_ATTEMPTS


def record_login_failure(client_ip: str) -> None:
    """Record a failed login attempt for the client IP."""
    now = time.time()
    failures = _LOGIN_FAILURES.setdefault(client_ip, [])
    failures.append(now)


def reset_login_failures(client_ip: str) -> None:
    """Reset failed login attempts upon successful authentication."""
    _LOGIN_FAILURES.pop(client_ip, None)


def is_local_request(request: Request) -> bool:
    """
    Check if the request originates from local test suite or explicit dev environment.
    Note: Remote access via Tailscale or local proxy is NOT exempted here.
    """
    if getattr(settings, "auth_disabled", False):
        return True
    return False


def check_auth_required(request: Request) -> bool:
    """
    Determine if authentication is required for the request.
    If AUTH_DISABLED is True or APP_PASSWORD is empty, auth is disabled.
    Otherwise, valid authentication (Cookie, Bearer, or Query) is strictly required.
    """
    if getattr(settings, "auth_disabled", False) or not settings.app_password:
        return False

    # Check Cookie
    cookie_token = request.cookies.get(AUTH_COOKIE_NAME) or request.cookies.get("agentwatch_token")
    if cookie_token and verify_session_token(cookie_token):
        return False

    # Check Bearer Header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        if verify_session_token(token):
            return False

    # Check Query Parameter (strictly allowed on WebSocket handshakes or mobile redirects)
    query_token = request.query_params.get("token")
    if query_token and verify_session_token(query_token):
        return False

    return True
