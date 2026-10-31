"""Main FastAPI application entry point for AgentWatch."""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pathlib import Path
import asyncio
import hashlib
import logging
import os
import time
from typing import Optional

from config.settings import settings
from config.database import init_db_indexes, close_mongo_client, check_mongo_connection
from api.routes import (
    health,
    events,
    sessions,
    controls,
    auth,
    interactions,
    git_review,
    diagnostics,
    attachments,
    files,
    queue_routes,
    push,
    tasks,
    messages,
    approvals,
    controls_remote,
)
from api.auth_middleware import dispatch_auth_middleware
from security.authentication import check_auth_required, verify_session_token, is_local_request
from services.log_buffer import attach_to_all_loggers, log_buffer_handler
from services.conversation_service import conversation_service
from services.interaction_service import interaction_service
from services.websocket_manager import websocket_manager
from integrations.antigravity.adapter import antigravity_adapter

from logging.handlers import TimedRotatingFileHandler

log_dir = Path("logs")
log_dir.mkdir(exist_ok=True)

# Console handler: strictly errors only
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.ERROR)
console_handler.setFormatter(
    logging.Formatter("%(asctime)s [%(levelname)s] [%(name)s] %(message)s")
)

from datetime import datetime


class DailyDateFileHandler(logging.Handler):
    """
    A robust file handler that writes directly to date-segregated files:
    e.g., logs/agentwatch_2026-10-25.log. Automatically rolls over when date changes.
    """

    def __init__(self, directory: Path, prefix: str = "agentwatch_"):
        super().__init__()
        self.directory = directory
        self.prefix = prefix
        self.current_date_str = ""
        self.file_handler: Optional[logging.FileHandler] = None

    def _get_handler(self) -> logging.FileHandler:
        today_str = datetime.now().strftime("%Y-%m-%d")
        if today_str != self.current_date_str or self.file_handler is None:
            if self.file_handler:
                self.file_handler.close()
            self.current_date_str = today_str
            log_path = self.directory / f"{self.prefix}{today_str}.log"
            self.file_handler = logging.FileHandler(log_path, encoding="utf-8")
            if self.formatter:
                self.file_handler.setFormatter(self.formatter)
        return self.file_handler

    def emit(self, record: logging.LogRecord):
        try:
            handler = self._get_handler()
            handler.emit(record)
        except Exception:
            self.handleError(record)

    def close(self):
        if self.file_handler:
            self.file_handler.close()
            self.file_handler = None
        super().close()


daily_file_handler = DailyDateFileHandler(log_dir)
daily_file_handler.setLevel(logging.DEBUG)
daily_file_handler.setFormatter(
    logging.Formatter("%(asctime)s [%(levelname)s] [%(name)s:%(lineno)d] %(message)s")
)

# Apply to root logger
root_logger = logging.getLogger()
root_logger.setLevel(getattr(logging, settings.log_level.upper(), logging.INFO))
root_logger.handlers = [console_handler, daily_file_handler]

# Reconfigure uvicorn standard loggers so access requests are not printed to console
for u_name in ("uvicorn", "uvicorn.access", "uvicorn.error"):
    u_log = logging.getLogger(u_name)
    u_log.handlers = [console_handler, daily_file_handler]
    u_log.propagate = False

logger = logging.getLogger("main")


from services.transcript_watcher import run_transcript_watcher


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle management."""
    attach_to_all_loggers()
    for u_name in ("uvicorn", "uvicorn.access", "uvicorn.error"):
        u_log = logging.getLogger(u_name)
        u_log.handlers = [console_handler, daily_file_handler, log_buffer_handler]
        u_log.propagate = False
    logger.info(
        "Starting AgentWatch server on %s:%d (env: %s)",
        settings.host,
        settings.port,
        settings.environment,
    )
    mongo_status = check_mongo_connection()
    if mongo_status["status"] == "connected":
        logger.info(
            "Connected to MongoDB %s database '%s'",
            mongo_status["version"],
            settings.mongodb_database,
        )
        try:
            init_db_indexes()
        except Exception as e:
            logger.warning("Could not initialize MongoDB indexes: %s", str(e))
    else:
        logger.warning("MongoDB not immediately reachable at startup: %s", mongo_status["error"])

    watcher_task = asyncio.create_task(run_transcript_watcher())

    yield

    logger.info("Shutting down AgentWatch server...")
    watcher_task.cancel()
    try:
        await watcher_task
    except asyncio.CancelledError:
        pass
    close_mongo_client()
    logger.info("Shutdown complete.")


app = FastAPI(
    title="AgentWatch",
    description="Service-Oriented Local-First Antigravity Observer and Mobile Monitor",
    version="2.0.0",
    lifespan=lifespan,
)

# GZip response compression for low bandwidth usage over mobile/Tailscale
app.add_middleware(GZipMiddleware, minimum_size=500)

# CORS Configuration: Restrict wildcard origins when credentials are supported
raw_origins = [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]
if "*" in raw_origins or not raw_origins:
    origins = [
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://*.ts.net",
    ]
else:
    origins = raw_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|.*\.ts\.net)(:\d+)?",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)


# Include API Routers
app.include_router(health.router)
app.include_router(events.router)
app.include_router(sessions.router)
app.include_router(controls.router)
app.include_router(auth.router)
app.include_router(interactions.router)
app.include_router(git_review.router)
app.include_router(diagnostics.router)
app.include_router(attachments.router)
app.include_router(files.router)
app.include_router(queue_routes.router)
app.include_router(push.router)
app.include_router(tasks.router)
app.include_router(messages.router)
app.include_router(approvals.router)
app.include_router(controls_remote.router)

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    return await dispatch_auth_middleware(request, call_next)


if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
    dist_dir = STATIC_DIR / "dist"
    if dist_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(dist_dir / "assets")), name="assets")

app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.get("/sw.js")
async def serve_sw():
    """Serve the root service worker file for Web Push notifications."""
    sw_file = STATIC_DIR / "dist" / "sw.js"
    if sw_file.exists():
        return FileResponse(str(sw_file), media_type="application/javascript")
    return JSONResponse(status_code=404, content={"detail": "Service Worker not found"})


@app.get("/manifest.json")
async def serve_manifest():
    """Serve Web App Manifest for mobile PWA installation."""
    manifest_file = STATIC_DIR / "dist" / "manifest.json"
    if manifest_file.exists():
        return FileResponse(str(manifest_file), media_type="application/manifest+json")
    return JSONResponse(status_code=404, content={"detail": "Manifest not found"})


@app.get("/favicon.svg")
async def serve_favicon_svg():
    """Serve SVG favicon."""
    fav_file = STATIC_DIR / "dist" / "favicon.svg"
    if fav_file.exists():
        return FileResponse(str(fav_file), media_type="image/svg+xml")
    return JSONResponse(status_code=404, content={"detail": "Favicon not found"})


@app.get("/logo.svg")
async def serve_logo_svg():
    """Serve standalone AgentWatch SVG brand logo."""
    logo_file = STATIC_DIR / "dist" / "logo.svg"
    if logo_file.exists():
        return FileResponse(str(logo_file), media_type="image/svg+xml")
    return JSONResponse(status_code=404, content={"detail": "Logo not found"})


@app.get("/")
async def serve_index(request: Request):
    """Serve mobile dashboard index page."""
    dist_index = STATIC_DIR / "dist" / "index.html"
    if dist_index.exists():
        return FileResponse(str(dist_index))
    return {"message": "AgentWatch Backend API Running. Static frontend not found."}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Real-time streaming WebSocket endpoint for conversation, status, and alerts."""
    # Origin and Authentication verification (Cross-Site WebSocket Hijacking protection)
    origin = websocket.headers.get("origin")
    client_host = websocket.client.host if websocket.client else ""
    is_local = client_host in ("127.0.0.1", "::1", "localhost", "testclient")

    if origin and not is_local:
        # Check if origin matches localhost, 127.0.0.1, or Tailscale domain (.ts.net)
        import re
        is_allowed_origin = bool(
            re.match(r"^https?://(localhost|127\.0\.0\.1|.*\.ts\.net)(:\d+)?$", origin)
        )
        if not is_allowed_origin:
            logger.warning("Rejected WebSocket connection from unauthorized origin: %s", origin)
            await websocket.close(code=1008)
            return

    # Check authentication if APP_PASSWORD configured and request is non-local
    if settings.app_password and not is_local:
        token = websocket.query_params.get("token")
        cookie_token = websocket.cookies.get("cw_auth_token")
        valid_auth = (token and verify_session_token(token)) or (cookie_token and verify_session_token(cookie_token))
        if not valid_auth:
            logger.warning("Rejected unauthenticated WebSocket connection from %s", client_host)
            await websocket.close(code=1008)
            return

    await websocket_manager.connect(websocket)
    try:
        paginated = conversation_service.get_paginated_conversation(limit=15)

        ag_status = antigravity_adapter.get_status()
        init_cid = ag_status.get("active_conversation_id")
        await websocket.send_json(
            {
                "type": "init",
                "status": "connected",
                "conversation_id": init_cid,
                "messages": paginated["messages"],
                "total": paginated["total"],
                "oldest_index": paginated["oldest_index"],
                "has_more": paginated["has_more"],
            }
        )
        pending_approval = conversation_service.get_pending_approval()
        if pending_approval:
            await websocket.send_json(
                {
                    "type": "pending_approval",
                    "approval": pending_approval,
                }
            )
        pending_interactions = interaction_service.list_pending()
        if pending_interactions:
            await websocket.send_json(
                {
                    "type": "interaction_prompt",
                    "interaction": pending_interactions[0],
                }
            )

        while True:
            text = await websocket.receive_text()
            if text == "ping":
                await websocket.send_json({"type": "pong"})
            elif text == "refresh_chat":
                paginated = conversation_service.get_paginated_conversation(limit=15)
                await websocket.send_json(
                    {
                        "type": "chat_update",
                        "messages": paginated["messages"],
                        "total": paginated["total"],
                        "oldest_index": paginated["oldest_index"],
                        "has_more": paginated["has_more"],
                    }
                )
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)
    except Exception as exc:
        logger.debug("WebSocket connection error: %s", str(exc))
        websocket_manager.disconnect(websocket)
