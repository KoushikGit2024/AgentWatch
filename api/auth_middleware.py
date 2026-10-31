"""Authentication middleware for FastAPI application."""

from fastapi import Request
from fastapi.responses import JSONResponse, RedirectResponse

from security.authentication import check_auth_required, verify_session_token

PUBLIC_PATHS = [
    "/health",
    "/ready",
    "/login",
    "/login.html",
    "/api/v1/login",
    "/static",
    "/uploads",
    "/favicon.ico",
    "/favicon.svg",
    "/logo.svg",
    "/sw.js",
    "/manifest.json",
    "/docs",
    "/openapi.json",
]


async def dispatch_auth_middleware(request: Request, call_next):
    path = request.url.path

    async def _safe_call_next():
        try:
            return await call_next(request)
        except (RuntimeError, ConnectionResetError, OSError) as exc:
            err_text = str(exc).lower()
            if "no response returned" in err_text or "connection closed" in err_text:
                return JSONResponse(status_code=499, content={"detail": "Client closed connection"})
            raise

    try:
        if any(path.startswith(p) for p in PUBLIC_PATHS) or path in (
            "/sw.js",
            "/manifest.json",
            "/favicon.svg",
            "/favicon.ico",
            "/logo.svg",
        ):
            return await _safe_call_next()

        if check_auth_required(request):
            if not path.startswith("/api/"):
                token = request.cookies.get("agentwatch_token")
                if not token:
                    auth_hdr = request.headers.get("Authorization", "")
                    if auth_hdr.startswith("Bearer "):
                        token = auth_hdr.split("Bearer ", 1)[1].strip()
                if not token or not verify_session_token(token):
                    return RedirectResponse(url="/login.html", status_code=303)
            else:
                auth_hdr = request.headers.get("Authorization", "")
                token = None
                if auth_hdr.startswith("Bearer "):
                    token = auth_hdr.split("Bearer ", 1)[1].strip()
                if not token:
                    token = request.cookies.get("agentwatch_token")
                if not token or not verify_session_token(token):
                    return JSONResponse(
                        status_code=401,
                        content={"detail": "Unauthorized: valid session token required."},
                    )

        return await _safe_call_next()
    except Exception as exc:
        err_msg = str(exc).lower()
        if "connection closed" in err_msg or "client disconnected" in err_msg:
            return JSONResponse(status_code=499, content={"detail": "Client disconnected"})
        raise

