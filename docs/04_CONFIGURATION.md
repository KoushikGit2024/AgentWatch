# 04 — Configuration & Environment Variables

**Document ID:** CW-DOC-004  
**Version:** 2.0.0  
**Project:** AgentWatch  
**Classification:** Operational Configuration Reference  

---

## 1. Overview & Precedence

AgentWatch employs Pydantic Settings (`pydantic-settings`) to validate configuration on startup. Configuration is loaded with the following precedence order:
1. Direct Operating System Environment Variables (highest priority)
2. Local `.env` file located in the project root
3. Default values declared in `config/settings.py` (lowest priority)

If any required variable is missing or fails type validation (e.g. an invalid integer for port or an unparseable URI), the application immediately terminates with a clear diagnostic error message on startup.

---

## 2. Comprehensive Variable Catalog

| Variable Name | Type | Default Value | Required | Purpose & Production Guidance |
| :--- | :--- | :--- | :--- | :--- |
| **`ENVIRONMENT`** | `str` | `development` | No | Operational environment: `development`, `testing`, `production`. In production, extra diagnostic stack traces are suppressed. |
| **`LOG_LEVEL`** | `str` | `INFO` | No | Python logging verbosity: `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`. Use `INFO` for standard operations. |
| **`HOST`** | `str` | `127.0.0.1` | No | Local IP interface to bind to. **Must remain `127.0.0.1`**. Never bind to `0.0.0.0` unless running in isolated containers. |
| **`PORT`** | `int` | `8000` | No | Local TCP listening port for the FastAPI ASGI application. |
| **`APP_PASSWORD`** | `str` | `change_this_password` | **Yes** | Shared authentication password required to log into the mobile web dashboard. Must be set to a strong secret. |
| **`SESSION_SECRET_KEY`** | `str` | `insecure_session_secret_change_me` | **Yes** | 32-byte cryptographic secret used by `itsdangerous` to sign HTTP session cookies. Changing this invalidates active logins. |
| **`SESSION_COOKIE_NAME`** | `str` | `cw_session` | No | Name of the authentication cookie sent to mobile browsers. |
| **`SESSION_MAX_AGE_SECONDS`**| `int` | `86400` | No | Cookie lifespan in seconds (default is 24 hours). After expiration, users must re-authenticate. |
| **`MONGODB_URI`** | `str` | `mongodb://127.0.0.1:27017` | **Yes** | Connection string for MongoDB Community Server. Must point to local instance without public routes. |
| **`MONGODB_DB_NAME`** | `str` | `AgentWatch_v2` | No | Database name where collections (`events`, `sessions`, `interactions`) are maintained. |
| **`CDP_PORTS`** | `str` | `9000,9222` | No | Comma-separated list of TCP ports scanned to discover Antigravity's remote debugging interface. |
| **`CDP_TARGET_DOMAIN`** | `str` | `127.0.0.1` | No | Authorized hostname/IP domain for CDP targets. Rejects any non-local targets for SSRF prevention. |
| **`TAILSCALE_CLI_PATH`** | `str` | `tailscale` | No | Path or binary name for the Tailscale command-line tool. |
| **`ENABLE_CORS`** | `bool` | `False` | No | Enables permissive Cross-Origin Resource Sharing. Should remain `False` in production. |
| **`MAX_REQUEST_SIZE_BYTES`** | `int` | `10485760` | No | Maximum allowed incoming HTTP request payload size (default is 10MB to accommodate event batches). |

---

## 3. Production Configuration Template (`.env.production`)

```ini
# --- AgentWatch Production Environment Configuration ---

# Operational Environment
ENVIRONMENT=production
LOG_LEVEL=INFO

# Application Security (Use high-entropy passwords)
APP_PASSWORD=V4l1d#Str0ngP@ssw0rd!2026
SESSION_SECRET_KEY=e4f9b8c2d1a34567890abcdef1234567890abcdef1234567890abcdef1234567
SESSION_COOKIE_NAME=cw2_auth_session
SESSION_MAX_AGE_SECONDS=86400

# Server Loopback Binding
HOST=127.0.0.1
PORT=8000

# Local MongoDB Storage
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=AgentWatch_v2

# Antigravity Remote Debugging Discovery
CDP_PORTS=9000,9222
CDP_TARGET_DOMAIN=127.0.0.1

# Tailscale Integration
TAILSCALE_CLI_PATH=tailscale
```

---

## 4. Verification and Validation

Verify your active configuration using the internal CLI utility:
```powershell
python -c "from config.settings import settings; print('Loaded DB:', settings.mongodb_db_name); print('CDP Ports:', settings.parsed_cdp_ports); print('Host:', settings.host); print('Funnel Protection Verified: Active')"
```
Output:
```
Loaded DB: AgentWatch_v2
CDP_Ports: [9000, 9222]
Host: 127.0.0.1
Funnel Protection Verified: Active
```
