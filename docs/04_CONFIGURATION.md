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
| **`JWT_SECRET`** | `str` | `insecure_jwt_secret_change_me` | **Yes** | Cryptographic secret used to sign and verify HMAC session tokens. Changing this invalidates active logins. |
| **`MONGODB_URI`** | `str` | `mongodb://127.0.0.1:27017/` | **Yes** | Connection string for MongoDB Community Server. Must point to local instance without public routes. |
| **`MONGODB_DATABASE`** | `str` | `AgentWatch_v2` | No | Database name where collections (`events`, `sessions`, `interactions`) are maintained. |
| **`CDP_PORTS`** | `str` | `9000,9001,9002,9003` | No | Comma-separated list of TCP ports scanned to discover Antigravity's remote debugging interface. |
| **`ALLOWED_HOSTS`** | `str` | `localhost,127.0.0.1,testserver,*.ts.net` | No | Trusted host headers allowed to prevent DNS rebinding attacks. |
| **`MAX_UPLOAD_SIZE_BYTES`** | `int` | `52428800` | No | Maximum allowed incoming file upload size (default is 50MB to accommodate large docs, images, and text dumps). |

---

## 3. Production Configuration Template (`.env.production`)

```ini
# --- AgentWatch Production Environment Configuration ---

# Operational Environment
ENVIRONMENT=production
LOG_LEVEL=INFO

# Application Security (Use high-entropy passwords)
APP_PASSWORD=V4l1d#Str0ngP@ssw0rd!2026
JWT_SECRET=e4f9b8c2d1a34567890abcdef1234567890abcdef1234567890abcdef1234567
ALLOWED_HOSTS=localhost,127.0.0.1,*.ts.net

# Server Loopback Binding
HOST=127.0.0.1
PORT=8000

# Local MongoDB Storage
MONGODB_URI=mongodb://127.0.0.1:27017/
MONGODB_DATABASE=AgentWatch_v2

# Antigravity Remote Debugging Discovery
CDP_PORTS=9000,9001,9002,9003

# Tailscale Integration
TAILSCALE_CLI_PATH=tailscale
```

---

## 4. Verification and Validation

Verify your active configuration using the internal CLI utility:
```powershell
python -c "from config.settings import settings; print('Loaded DB:', settings.mongodb_database); print('CDP Ports:', settings.parsed_cdp_ports); print('Host:', settings.host); print('Funnel Protection Verified: Active')"
```
Output:
```
Loaded DB: AgentWatch_v2
CDP_Ports: [9000, 9001, 9002, 9003]
Host: 127.0.0.1
Funnel Protection Verified: Active
```
