"""Main FastAPI application entry point for CloudWatchV2."""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import os

from config.settings import settings
from config.database import init_db_indexes, close_mongo_client, check_mongo_connection
from api.routes import health, events, sessions, controls, auth, interactions
from security.authentication import check_auth_required
import logging

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s"
)
logger = logging.getLogger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle management."""
    logger.info("Starting CloudWatchV2 server on %s:%d (env: %s)", settings.host, settings.port, settings.environment)
    # 1. Initialize MongoDB indexes and verify connectivity
    mongo_status = check_mongo_connection()
    if mongo_status["status"] == "connected":
        logger.info("Connected to MongoDB %s database '%s'", mongo_status["version"], settings.mongodb_database)
        try:
            init_db_indexes()
        except Exception as e:
            logger.warning("Could not initialize MongoDB indexes: %s", str(e))
    else:
        logger.warning("MongoDB not immediately reachable at startup: %s", mongo_status["error"])

    yield

    # Application shutdown
    logger.info("Shutting down CloudWatchV2 server...")
    close_mongo_client()
    logger.info("Shutdown complete.")


app = FastAPI(
    title="CloudWatchV2",
    description="Service-Oriented Local-First Antigravity Observer and Mobile Monitor",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS Middleware
origins = [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(health.router)
app.include_router(events.router)
app.include_router(sessions.router)
app.include_router(controls.router)
app.include_router(auth.router)
app.include_router(interactions.router)

# Static files path
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"


# Authentication Guard Middleware for Protected API / Dashboard
@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    # Allow public endpoints
    public_paths = [
        "/health",
        "/ready",
        "/login",
        "/api/v1/login",
        "/static",
        "/favicon.ico",
        "/docs",
        "/openapi.json",
    ]
    path = request.url.path
    if any(path.startswith(p) for p in public_paths):
        return await call_next(request)

    # Check authentication if required
    if check_auth_required(request):
        # If accessing the web UI directly, redirect to login page or return 401
        if not path.startswith("/api/"):
            login_file = STATIC_DIR / "login.html"
            if login_file.exists():
                return FileResponse(str(login_file))
        return JSONResponse(status_code=401, content={"detail": "Authentication required"})

    return await call_next(request)


# Mount static frontend
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
async def serve_index(request: Request):
    """Serve mobile dashboard index page."""
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {"message": "CloudWatchV2 Backend API Running. Static frontend not found."}
