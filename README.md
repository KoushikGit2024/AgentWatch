# CloudWatchV2 📱 — Service-Oriented Local-First Antigravity Observer & Mobile Monitor

CloudWatchV2 is an independent, service-oriented system designed for local-first observation of Google Antigravity coding agents from your phone or mobile browser over secure, private **Tailscale** networking, backed by **local MongoDB Community Server**.

---

## 🌟 Key Features

- **🚀 Modular Service Architecture**: Built in Python with **FastAPI**, with clear separation between API transport, business services, Antigravity integration, and persistence.
- **🍃 MongoDB Local Persistence**: Local document storage in MongoDB Community Server with deterministic event deduplication (`source_event_id`), session tracking, and chronological timeline indexing.
- **🔒 Zero-Trust Tailscale Remote Access**: Access your mobile dashboard over private tailnet HTTPS (`tailscale serve`). Tailscale Funnel is strictly disabled.
- **🛡️ Strict Secret Redaction**: Recursive scanning and redacting of tokens, passwords, and API keys across nested payloads before persistence.
- **📱 Responsive Mobile Dashboard**: Glassmorphism mobile UI with native-feeling drawer, live state polling, and event inspection.
- **🩺 Automated Diagnostics**: Single-command diagnostic suite (`doctor.ps1`, `remote-status.ps1`, `check_privacy.py`).

---

## 🏗️ Architecture Summary

```
                      +-----------------------------+
                      |   Antigravity Desktop IDE   |
                      |   (Subprocess Context / CDP)|
                      +--------------+--------------+
                                     |
                                     | Event metadata & CDP Status
                                     v
+--------------------------------------------------------------------------+
|                            CloudWatchV2 Backend                          |
|                                                                          |
|  +--------------------+   +---------------------+   +-----------------+  |
|  | Antigravity Adapter|-->| Event Ingestion Svc |-->| Redaction Engine|  |
|  +--------------------+   +----------+----------+   +-----------------+  |
|                                      |                                   |
|                                      v                                   |
|                           +---------------------+                        |
|                           |  PyMongo Repository |                        |
|                           +----------+----------+                        |
+--------------------------------------|-----------------------------------+
                                       |
                                       v
                     +----------------------------------+
                     | Local MongoDB Community Server   |
                     | (127.0.0.1:27017/cloudwatch_v2)  |
                     +----------------------------------+
                                       ^
                                       |
                 +---------------------+---------------------+
                 |  FastAPI Web Service (127.0.0.1:8000)     |
                 +---------------------+---------------------+
                                       |
                                       v
                 +---------------------+---------------------+
                 |       Tailscale Serve (Tailnet Only)      |
                 |     (Private Encrypted HTTPS Proxy)       |
                 +---------------------+---------------------+
                                       |
                                       v
                 +---------------------+---------------------+
                 |      Android Mobile Web Browser           |
                 +-------------------------------------------+
```

---

## ⚡ Quick Start (PowerShell)

### 1. Setup Dependencies
```powershell
.\scripts\setup.ps1
```

### 2. Run Diagnostics
```powershell
.\scripts\doctor.ps1
```

### 3. Start Backend
```powershell
.\scripts\start.ps1
```
Open local dashboard: `http://127.0.0.1:8000`

### 4. Enable Private Tailscale Access (Phone Access)
```powershell
# Check current Tailscale status
.\scripts\remote-status.ps1

# Configure Tailscale Serve (Never enable Funnel)
tailscale serve --bg 8000
```
Open the private tailnet URL on your Android phone connected to the same tailnet!

### 5. Stop Backend
```powershell
.\scripts\stop.ps1
```

---

## 🧪 Testing & Verification

Run the automated test suite:
```powershell
.\.venv\Scripts\python.exe -m pytest -v
```

Run the privacy & secret scanner:
```powershell
.\.venv\Scripts\python.exe scripts\check_privacy.py
```

---

## 📚 Complete Documentation

1. [00_PROJECT_OVERVIEW.md](docs/00_PROJECT_OVERVIEW.md)
2. [01_ARCHITECTURE.md](docs/01_ARCHITECTURE.md)
3. [02_FEATURE_CATALOG.md](docs/02_FEATURE_CATALOG.md)
4. [03_INSTALLATION.md](docs/03_INSTALLATION.md)
5. [04_CONFIGURATION.md](docs/04_CONFIGURATION.md)
6. [05_ANTIGRAVITY_INTEGRATION.md](docs/05_ANTIGRAVITY_INTEGRATION.md)
7. [06_API_REFERENCE.md](docs/06_API_REFERENCE.md)
8. [07_DATABASE_AND_DATA_FLOW.md](docs/07_DATABASE_AND_DATA_FLOW.md)
9. [08_SECURITY_AND_PRIVACY.md](docs/08_SECURITY_AND_PRIVACY.md)
10. [09_TAILSCALE_SETUP.md](docs/09_TAILSCALE_SETUP.md)
11. [10_ANDROID_ACCESS.md](docs/10_ANDROID_ACCESS.md)
12. [11_TESTING_AND_VALIDATION.md](docs/11_TESTING_AND_VALIDATION.md)
13. [12_TROUBLESHOOTING.md](docs/12_TROUBLESHOOTING.md)
14. [13_DEVELOPMENT_GUIDE.md](docs/13_DEVELOPMENT_GUIDE.md)
15. [14_MIGRATION_NOTES.md](docs/14_MIGRATION_NOTES.md)
16. [15_KNOWN_LIMITATIONS.md](docs/15_KNOWN_LIMITATIONS.md)
