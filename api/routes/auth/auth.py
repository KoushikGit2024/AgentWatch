"""Authentication routes for dashboard login and logout."""

import secrets
from fastapi import APIRouter, Response, Request, HTTPException, status
from models.schemas import LoginRequest
from security.authentication import (
    generate_session_token,
    revoke_session_token,
    is_login_rate_limited,
    record_login_failure,
    reset_login_failures,
    AUTH_COOKIE_NAME,
)
from config.settings import settings

router = APIRouter(tags=["Authentication"])


@router.post("/login")
@router.post("/api/v1/login")
def login(payload: LoginRequest, request: Request, response: Response):
    """Verify password with rate limiting, timing-safe equality, and set httpOnly session cookie."""
    client_ip = request.client.host if request.client else "unknown"

    if is_login_rate_limited(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please wait 60 seconds.",
        )

    # Timing-safe password comparison
    expected_password = settings.app_password or ""
    if not secrets.compare_digest(payload.password, expected_password):
        record_login_failure(client_ip)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid password")

    reset_login_failures(client_ip)
    token = generate_session_token(payload.password)

    # Secure cookie attributes (allow HTTPS via x-forwarded-proto or request scheme)
    is_secure = request.headers.get("x-forwarded-proto", "").lower() == "https" or request.url.scheme == "https"

    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=token,
        max_age=30 * 24 * 3600,  # 30 days
        expires=30 * 24 * 3600,
        path="/",
        httponly=True,
        samesite="lax",
        secure=is_secure,
    )
    # Also set agentwatch_token cookie for UI compatibility
    response.set_cookie(
        key="agentwatch_token",
        value=token,
        max_age=30 * 24 * 3600,
        expires=30 * 24 * 3600,
        path="/",
        httponly=True,
        samesite="lax",
        secure=is_secure,
    )
    return {"status": "authenticated", "token": token}


@router.post("/logout")
@router.post("/api/v1/logout")
def logout(request: Request, response: Response):
    """Clear session cookie and revoke server-side token."""
    token = (
        request.cookies.get(AUTH_COOKIE_NAME)
        or request.cookies.get("agentwatch_token")
    )
    if not token:
        auth_hdr = request.headers.get("Authorization", "")
        if auth_hdr.startswith("Bearer "):
            token = auth_hdr.split("Bearer ", 1)[1].strip()

    if token:
        revoke_session_token(token)

    response.delete_cookie(key=AUTH_COOKIE_NAME, path="/")
    response.delete_cookie(key="agentwatch_token", path="/")
    return {"status": "logged_out"}
