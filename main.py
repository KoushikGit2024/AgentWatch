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
)
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


async def watch_transcript_loop():
    """
    Continuously watches transcript.jsonl AND active Antigravity CDP DOM popups
    for updates, broadcasting lightweight paginated chat updates, command approvals,
    and dynamic question interactions live to connected mobile clients.
    """
    last_mtime = 0.0
    last_size = 0
    last_approval_key = None
    last_interaction_id = None
    dom_probe_tick = 0
    cached_dom_approval = None
    dom_miss_count = 0

    approval_candidate_key = None
    approval_candidate_time = 0.0

    while True:
        try:
            p = conversation_service.get_latest_transcript_path()
            transcript_changed = False
            if p and p.exists():
                stat = p.stat()
                mtime = stat.st_mtime
                size = stat.st_size
                if mtime != last_mtime or size != last_size:
                    last_mtime = mtime
                    last_size = size
                    transcript_changed = True

            if transcript_changed:
                paginated = conversation_service.get_paginated_conversation(limit=15)
                if websocket_manager.active_connections:
                    await websocket_manager.broadcast(
                        {
                            "type": "chat_update",
                            "messages": paginated["messages"],
                            "total": paginated["total"],
                            "oldest_index": paginated["oldest_index"],
                            "has_more": paginated["has_more"],
                        }
                    )

            dom_probe_tick = (dom_probe_tick + 1) % 2
            if websocket_manager.active_connections or transcript_changed:
                if not transcript_changed and dom_probe_tick == 0:
                    conversation_service.get_recent_conversation(limit=15)

                pending_approval = conversation_service.get_pending_approval()

                if dom_probe_tick == 0:
                    ag_status = antigravity_adapter.get_status()
                    if ag_status.get("cdp", {}).get("connected"):
                        dom_popup = await antigravity_adapter.inspect_active_popup()
                        if dom_popup.get("has_popup"):
                            dom_miss_count = 0
                            if dom_popup.get("popup_kind") == "question":
                                cached_dom_approval = None
                                interaction_service.sync_question_from_transcript(
                                    session_id="cdp_live_session",
                                    question_data={
                                        "question": dom_popup.get("title") or "Select an option",
                                        "options": dom_popup.get("options") or [],
                                        "is_multi_select": dom_popup.get("is_multi_select", False),
                                        "allow_custom_response": dom_popup.get(
                                            "allow_custom_response", True
                                        ),
                                    },
                                    is_active=True,
                                )
                            elif not pending_approval:
                                target_str = (
                                    dom_popup.get("command")
                                    or dom_popup.get("target")
                                    or dom_popup.get("title")
                                    or "action"
                                )
                                step_hash = hashlib.md5(
                                    target_str.encode("utf-8", errors="ignore")
                                ).hexdigest()[:8]
                                step_id = f"dom-{step_hash}"
                                if step_id not in conversation_service._resolved_approvals:
                                    cached_dom_approval = {
                                        "step_id": step_id,
                                        "request_type": "command"
                                        if dom_popup.get("command")
                                        else "decision",
                                        "target": target_str,
                                        "title": dom_popup.get("title")
                                        or "Antigravity Approval Required",
                                        "description": "Detected live confirmation popup in Antigravity IDE.",
                                        "command": dom_popup.get("command"),
                                        "options": dom_popup.get("options"),
                                        "allow_custom_response": True,
                                    }
                        else:
                            dom_miss_count += 1
                            # Require 4 consecutive misses (~2.8s) before dismissing live popup to prevent transient flicker
                            if dom_miss_count >= 4:
                                cached_dom_approval = None
                                if (
                                    conversation_service._latest_pending_approval
                                    and conversation_service._latest_pending_approval.get(
                                        "step_id", ""
                                    ).startswith("dom-")
                                ):
                                    conversation_service._latest_pending_approval = None
                                # Clear stale DOM approvals so future prompts for the same command/URL can pop up again
                                conversation_service._resolved_approvals = {
                                    k: v
                                    for k, v in conversation_service._resolved_approvals.items()
                                    if not k.startswith("dom-") and not k.startswith("cmd-")
                                }
                                interaction_service.sync_question_from_transcript(
                                    session_id="cdp_live_session",
                                    question_data=None,
                                    is_active=False,
                                )

                # Use cached dom approval if transcript doesn't specify one
                if not pending_approval and cached_dom_approval:
                    pending_approval = cached_dom_approval
                    conversation_service._latest_pending_approval = cached_dom_approval

                cur_approval_key = pending_approval.get("step_id") if pending_approval else None
                now = time.time()

                # Debounce / grace period (500ms): verify candidate stays active before broadcasting to prevent fast auto-running commands from flashing
                if cur_approval_key and cur_approval_key != last_approval_key:
                    if approval_candidate_key != cur_approval_key:
                        approval_candidate_key = cur_approval_key
                        approval_candidate_time = now
                    elif (now - approval_candidate_time) >= 0.5:
                        last_approval_key = cur_approval_key
                        approval_candidate_key = None
                        await websocket_manager.broadcast(
                            {
                                "type": "pending_approval",
                                "approval": pending_approval,
                            }
                        )
                        try:
                            from services.web_push_service import web_push_service

                            cmd_title = pending_approval.get("title") or "Approval Needed"
                            cmd_target = (
                                pending_approval.get("command")
                                or pending_approval.get("target")
                                or "Action"
                            )
                            web_push_service.send_notification(
                                title=f"⚠️ {cmd_title}",
                                body=f"Agent requesting approval: {cmd_target[:120]}",
                                tag=f"approval-{cur_approval_key}",
                                url="/",
                                data={"type": "approval", "step_id": cur_approval_key},
                            )
                        except Exception as push_err:
                            logger.debug("Failed to dispatch approval web push: %s", str(push_err))
                else:
                    if not cur_approval_key:
                        approval_candidate_key = None
                        if last_approval_key is not None:
                            last_approval_key = None
                            await websocket_manager.broadcast(
                                {
                                    "type": "approval_dismissed",
                                }
                            )

                pending_list = interaction_service.list_pending()
                active_interaction = pending_list[0] if pending_list else None
                cur_int_id = (
                    active_interaction.get("interaction_id") if active_interaction else None
                )
                if cur_int_id and cur_int_id != last_interaction_id:
                    last_interaction_id = cur_int_id
                    await websocket_manager.broadcast(
                        {
                            "type": "interaction_prompt",
                            "interaction": active_interaction,
                        }
                    )
                    try:
                        from services.web_push_service import web_push_service

                        prompt_msg = (
                            active_interaction.get("prompt") or "Agent has a question for you"
                        )
                        web_push_service.send_notification(
                            title="❓ Agent Input Required",
                            body=prompt_msg[:120],
                            tag=f"interaction-{cur_int_id}",
                            url="/",
                            data={"type": "interaction", "interaction_id": cur_int_id},
                        )
                    except Exception as push_err:
                        logger.debug("Failed to dispatch interaction web push: %s", str(push_err))
                elif not cur_int_id and last_interaction_id is not None:
                    prev_id = last_interaction_id
                    last_interaction_id = None
                    await websocket_manager.broadcast(
                        {
                            "type": "interaction_resolved",
                            "interaction_id": prev_id,
                        }
                    )

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.debug("Transcript watcher loop notice: %s", str(e))
        await asyncio.sleep(0.35)


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

    watcher_task = asyncio.create_task(watch_transcript_loop())

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

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    public_paths = [
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
        if any(path.startswith(p) for p in public_paths) or path in (
            "/sw.js",
            "/manifest.json",
            "/favicon.svg",
            "/favicon.ico",
            "/logo.svg",
        ):
            return await _safe_call_next()

        if check_auth_required(request):
            if not path.startswith("/api/"):
                login_file = STATIC_DIR / "login.html"
                if login_file.exists():
                    return FileResponse(str(login_file))
            return JSONResponse(status_code=401, content={"detail": "Authentication required"})

        return await _safe_call_next()
    except Exception as exc:
        if exc.__class__.__name__ == "EndOfStream":
            return JSONResponse(status_code=499, content={"detail": "Client stream closed"})
        raise



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

        await websocket.send_json(
            {
                "type": "init",
                "status": "connected",
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
