"""Authentication routes for dashboard login and logout."""

from fastapi import APIRouter, Response, HTTPException, status
from models.schemas import LoginRequest
from security.authentication import generate_session_token, AUTH_COOKIE_NAME
from config.settings import settings

router = APIRouter(tags=["Authentication"])


@router.post("/login")
@router.post("/api/v1/login")
def login(payload: LoginRequest, response: Response):
    """Verify password and set httpOnly session cookie."""
    if payload.password != settings.app_password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid password")

    token = generate_session_token(payload.password)
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,  # Can be true behind HTTPS Tailscale Serve
    )
    return {"status": "authenticated", "token": token}


@router.post("/logout")
@router.post("/api/v1/logout")
def logout(response: Response):
    """Clear session cookie."""
    response.delete_cookie(key=AUTH_COOKIE_NAME)
    return {"status": "logged_out"}
