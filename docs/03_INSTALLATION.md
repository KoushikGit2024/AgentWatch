# 03 — Installation & Environment Setup

**Document ID:** CW-DOC-003  
**Version:** 2.0.0  
**Project:** AgentWatch  
**Classification:** Operational Installation Guide  

---

## 1. System Requirements & Prerequisites

Before installing AgentWatch, ensure your workstation meets the following minimum requirements:

| Component | Requirement | Recommended | Notes |
| :--- | :--- | :--- | :--- |
| **Operating System** | Windows 10/11, macOS, Linux | Windows 11 (PowerShell 7) | Host where Antigravity IDE runs |
| **Python Runtime** | Python 3.12.0+ | Python 3.12.6 | Must be on system PATH |
| **Database** | MongoDB Community Server 7.x+ | MongoDB Community Server 8.0.x | Bound to `127.0.0.1:27017` |
| **IDE** | Google Antigravity IDE | Latest stable build | Installed in user AppData |
| **Remote Network** | Tailscale Client | Latest Tailscale version | Logged in on both PC and Phone |
| **Browser (Mobile)** | Modern mobile browser | Android Chrome / iOS Safari | Supports ES6 Modules |

---

## 2. Step-by-Step Installation Guide

### Step 2.1: Clone the Repository
Clone the repository to your local development drive:
```powershell
cd "d:\All Codes\AllProjects"
git clone https://github.com/KoushikGit2024/AgentWatch.git AgentWatch
cd AgentWatch
```

### Step 2.2: Set Up Python Virtual Environment
Create and activate an isolated Python 3.12 virtual environment:
```powershell
# Create virtual environment
python -m venv .venv

# Activate on Windows PowerShell
.\.venv\Scripts\Activate.ps1

# Activate on Linux / macOS
# source .venv/bin/activate
```

### Step 2.3: Install Dependencies
Install all required production and testing dependencies:
```powershell
pip install --upgrade pip
pip install -r requirements.txt
```

Verify that key packages are correctly installed:
```powershell
python -c "import fastapi, pymongo, pydantic, httpx, websockets, pytest; print('All core dependencies installed successfully!')"
```

### Step 2.4: Install & Verify Local MongoDB
AgentWatch requires a local MongoDB Community Server running on `localhost:27017`.

1. **Verify MongoDB Service:**
   ```powershell
   Get-Service -Name MongoDB
   ```
2. **If stopped, start the service:**
   ```powershell
   Start-Service -Name MongoDB
   ```
3. **Verify TCP Port 27017:**
   ```powershell
   Get-NetTCPConnection -LocalPort 27017 -State Listen
   ```
   You should see `127.0.0.1:27017` actively listening.

---

## 3. Configuring Environment Variables

Create your local `.env` configuration file from the template:
```powershell
Copy-Item .env.example .env
```

Open `.env` in your text editor and configure key parameters:
```ini
# Environment Mode
ENVIRONMENT=development
LOG_LEVEL=INFO

# Application Security
APP_PASSWORD=YourStrongSuperSecretPassword123!
SESSION_SECRET_KEY=generate_a_random_32_byte_hex_string_here

# Local Server Binding
HOST=127.0.0.1
PORT=8000

# MongoDB Configuration
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=AgentWatch_v2

# Antigravity CDP Discovery Ports
CDP_PORTS=9000,9222
CDP_TARGET_DOMAIN=127.0.0.1
```

*Note: For detailed information on every variable, see [04 — Configuration Guide](file:///d:/All%20Codes/AllProjects/AgentWatchV2/docs/04_CONFIGURATION.md).*

---

## 4. Initializing Database Indexes

Run the initialization script to ensure all compound indexes and unique constraints are created in MongoDB:
```powershell
python -c "from config.database import get_database, ensure_indexes; db = get_database(); ensure_indexes(db); print('Indexes verified!')"
```

---

## 5. Running the Application

### Running Locally (Direct ASGI Server)
Start the FastAPI server via Uvicorn with auto-reload:
```powershell
.\.venv\Scripts\activate
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
You can now access the local dashboard at: `http://127.0.0.1:8000`.

### Verifying Service Health
Test the health and readiness endpoints in PowerShell or via curl:
```powershell
# Health Check (Liveness)
Invoke-RestMethod -Uri "http://127.0.0.1:8000/health"

# Readiness Check (MongoDB & Configuration)
Invoke-RestMethod -Uri "http://127.0.0.1:8000/ready"
```
Expected output:
```json
{
  "status": "ready",
  "database": "connected",
  "tailscale_funnel_safe": true,
  "antigravity_adapter": "initialized"
}
```

---

## 6. Configuring Tailscale for Secure Android Access

To access the dashboard from your phone without opening public firewall ports:

1. **Verify Tailscale is running on your PC:**
   ```powershell
   tailscale status
   ```
2. **Enable Tailscale Serve (Funnel strictly disabled):**
   ```powershell
   tailscale serve --bg 8000
   ```
3. **Check Serve Status:**
   ```powershell
   tailscale serve status
   ```
   It will output your private tailnet HTTPS URL, for example: `https://my-workstation.tailnet-xyz.ts.net/`.
4. **Open this URL on your mobile phone:**
   Ensure your phone is connected to the same Tailscale account. Enter your `APP_PASSWORD` on the login page to access the mobile interaction dashboard.
