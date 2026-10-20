# 04 — Configuration Specification

CloudWatchV2 configuration is managed through Pydantic Settings with support for environment variables and `.env` files.

| Variable | Default | Description |
|---|---|---|
| `HOST` | `127.0.0.1` | Local IP binding for FastAPI backend |
| `PORT` | `8000` | Port for backend server |
| `ENVIRONMENT` | `development` | Deployment environment name |
| `LOG_LEVEL` | `INFO` | Console logging verbosity |
| `APP_PASSWORD` | `antigravity` | Passcode for dashboard and API access |
| `JWT_SECRET` | `placeholder_key` | Secret key used for signing session HMACs |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/` | Connection URI to local MongoDB |
| `MONGODB_DATABASE` | `cloudwatch_v2` | Application database name |
| `MONGODB_CONNECT_TIMEOUT_MS` | `3000` | Connection timeout in milliseconds |
| `MONGODB_SERVER_SELECTION_TIMEOUT_MS` | `3000` | Server selection timeout |
| `CDP_PORTS` | `9000,9001,9002,9003` | Ports scanned for Antigravity remote debugging |
| `TAILSCALE_SERVE_ENABLED` | `true` | Declares Tailscale Serve proxying intent |
