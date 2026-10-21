# AgentWatch 📱 — Local-First Antigravity Observer & Mobile Monitor

> **Empower your workflow:** Monitor, review, and control local Google Antigravity AI coding agents from any device — desktop, tablet, or phone — over private peer-to-peer networking with zero cloud dependencies.

---

## 📑 Table of Contents

- [1. Overview & What Problem AgentWatch Solves](#1-overview--what-problem-agentwatch-solves)
- [2. Architectural Deep-Dive](#2-architectural-deep-dive)
  - [How It Works Under the Hood](#how-it-works-under-the-hood)
  - [Data Flow Diagram](#data-flow-diagram)
- [3. Complete Feature Catalog](#3-complete-feature-catalog)
  - [Live Agent Monitoring & Reasoning Stream](#live-agent-monitoring--reasoning-stream)
  - [Interactive Command & Action Approvals](#interactive-command--action-approvals)
  - [Agent Decision & Inquiry Dialogs](#agent-decision--inquiry-dialogs)
  - [Prompt Composer with Image & File Attachments](#prompt-composer-with-image--file-attachments)
  - [CDP-Powered IDE Viewport Screencast](#cdp-powered-ide-viewport-screencast)
  - [Git Changes & File Diff Inspection](#git-changes--file-diff-inspection)
- [4. System Requirements & Prerequisites](#4-system-requirements--prerequisites)
- [5. Complete Step-by-Step Installation & Setup](#5-complete-step-by-step-installation--setup)
  - [Step 1: Clone Repository & Virtual Environment Setup](#step-1-clone-repository--virtual-environment-setup)
  - [Step 2: Configuration & Environment Variables](#step-2-configuration--environment-variables)
  - [Step 3: Compiling the Frontend Client](#step-3-compiling-the-frontend-client)
  - [Step 4: Running System Diagnostics](#step-4-running-system-diagnostics)
  - [Step 5: Launching the Application](#step-5-launching-the-application)
- [6. Mobile Remote Access via Tailscale](#6-mobile-remote-access-via-tailscale)
  - [Why Tailscale?](#why-tailscale)
  - [Configuration Steps](#configuration-steps)
- [7. Operational Management & PowerShell Scripts](#7-operational-management--powershell-scripts)
- [8. Repository Map & Codebase Anatomy](#8-repository-map--codebase-anatomy)
- [9. Testing, Diagnostics & Privacy Validation](#9-testing-diagnostics--privacy-validation)
- [10. Troubleshooting & FAQ](#10-troubleshooting--faq)

---

## 1. Overview & What Problem AgentWatch Solves

When running autonomous AI coding agents (such as Google Antigravity), developers frequently step away from their desk while long-running tasks execute: running test suites, refactoring code, conducting multi-turn web searches, or executing terminal scripts.

However, existing agent workflows suffer from major friction points:
1. **Approval Bottlenecks:** When an agent pauses to ask for elevation approval (e.g. running un-sandboxed commands), the workflow freezes until you return to your workstation.
2. **Missing Visibility:** You cannot see the agent's step-by-step thought stream, command exit codes, or file edits from your mobile device.
3. **Cloud Privacy Risks:** Sending internal source code, terminal output, and proprietary tokens to external SaaS dashboards compromises enterprise privacy.

**AgentWatch solves this completely:**
- **100% Local-First:** Runs locally on your machine. All session metadata, transcripts, and logs remain on your local disk and local MongoDB instance.
- **Zero-Cloud Remote Control:** Securely connect from your mobile browser using private encrypted **Tailscale** peer-to-peer networking.
- **Full Action Dispatch:** Review terminal commands, inspect line deltas, click **Allow / Deny**, or answer agent inquiries right from your phone.

---

## 2. Architectural Deep-Dive

### How It Works Under the Hood

AgentWatch operates as an intelligent observer sitting between your local Antigravity runtime, local persistence, and connected web clients:

1. **Transcript Watcher (`services/conversation_service.py`)**: Continuously monitors the active Antigravity session's `transcript.jsonl`. When new lines are written, it parses agent thoughts, tool invocations (`run_command`, `write_to_file`, `replace_file_content`, `grep_search`), terminal outputs, and calculates unified file diffs.
2. **WebSocket Real-Time Broadcast (`services/websocket_manager.py`)**: Automatically broadcasts fresh turns and status updates to all connected browser sessions within milliseconds.
3. **Chrome DevTools Protocol (CDP) Bridge (`integrations/antigravity/cdp_actions.py`)**: Connects to the Antigravity desktop IDE's remote debugging ports (`9000-9003`). When you click **Allow** or **Deny** on your phone, AgentWatch dispatches DOM events directly into the desktop IDE to click the native dialog buttons without requiring physical keyboard/mouse interaction.
4. **Local Document Store (`repositories/`)**: Persists events, sessions, interactions, and attachments in **MongoDB Community Server** (`mongodb://127.0.0.1:27017`), complete with SHA-256 deduplication and secret redaction.

### Data Flow Diagram

```
+-------------------------------------------------------------------------------+
|                           Your Local Workstation                              |
|                                                                               |
|  +--------------------------------+       +--------------------------------+  |
|  |     Antigravity Desktop IDE    |       |      Active Project Folder     |  |
|  |  - Agent Execution Engine     |       |  - Code Files & Diffs          |  |
|  |  - CDP Remote Debugging (9000) |       |  - Local Git Repository        |  |
|  +----------------+---------------+       +----------------+---------------+  |
|                   |                                        |                  |
|     Session Logs  | CDP Actions &                          | File Reads &     |
|   & Transcripts   | Dialog Clicks                          | Git Inspection   |
|                   v                                        v                  |
|  +-------------------------------------------------------------------------+  |
|  |                           AgentWatch Backend                            |  |
|  |                            (FastAPI / Python)                           |  |
|  |                                                                         |  |
|  |  [Transcript Parser]   [CDP Integration]   [Diff Engine]   [Auth Guard] |  |
|  |           |                     ^                 |              |      |  |
|  |           v                     |                 v              |      |  |
|  |     [WebSocket Bus] <-----------+---------> [REST API Endpoints]        |  |
|  |           |                                       |                     |  |
|  |           +-------------------+-------------------+                     |  |
|  |                               |                                         |  |
|  |                               v                                         |  |
|  |                 [Local MongoDB Community Server]                        |  |
|  |                  (127.0.0.1:27017/AgentWatch_v2)                        |  |
|  +-------------------------------+-----------------------------------------+  |
|                                  |                                            |
|                                  v                                            |
|                  [Tailscale Encrypted Private Proxy]                          |
|                       (Port 8000 -> Private Tailnet)                          |
+----------------------------------+--------------------------------------------+
                                   |
                                   v  (Private End-to-End Encrypted HTTPS)
+-------------------------------------------------------------------------------+
|                       Any Connected Client Device                             |
|                                                                               |
|   +----------------------------+             +----------------------------+   |
|   |   Desktop Browser (Chrome) |             |  Mobile Browser (Phone)    |   |
|   |   - Full Screen Dashboard  |             |  - Responsive Glass UI     |   |
|   |   - Terminal Output Stream |             |  - Tap Allow / Deny        |   |
|   |   - Image Paste & Upload   |             |  - Live Screencast View    |   |
|   +----------------------------+             +----------------------------+   |
+-------------------------------------------------------------------------------+
```

---

## 3. Complete Feature Catalog

### Live Agent Monitoring & Reasoning Stream
- **Real-Time Stream:** Watch agent actions unfold line-by-line.
- **Thinking Accordion:** Collapsible thinking blocks calculating reasoning duration (e.g., *"Thought for 4s"*).
- **Execution Badges:** Real-time feedback showing status (`working`, `done`, `failed`), command exit codes (`exit 0`), and execution timings.
- **Line-by-Line Diffs:** Embedded diff viewer displaying exact red deletions and green additions directly inside the chat turn.

### Interactive Command & Action Approvals
- **`ApprovalModal`:** When an agent attempts an action that requires sandbox elevation or terminal execution permission, a full-screen glassmorphism modal opens immediately.
- **Command Details:** Displays the exact command string (`$ npm run test`), the working directory (`cwd`), and permission risk notices.
- **One-Tap Actions:**
  - **Allow:** Dispatches an approval signal to the IDE via CDP.
  - **Always Allow:** Whitelists the command pattern in the IDE.
  - **Deny:** Cancels execution and returns a denial response to the agent.

### Agent Decision & Inquiry Dialogs
- **`InteractionModal`:** Triggered when the agent invokes `ask_question` to gather guidance.
- **Custom Choices:** Renders interactive radio buttons or checkboxes for multiple options provided by the agent.
- **Write-In Feedback:** Includes a text input field so you can provide custom written instructions or clarifications back to the agent.

### Prompt Composer with Image & File Attachments
- **Multi-Modal Input:** Remote prompt composer allowing you to steer the agent from your mobile phone.
- **Clipboard Paste:** Paste screenshots directly from your clipboard (`Ctrl+V` or mobile paste); instant image thumbnail generation.
- **Media Lightbox:** Click any uploaded or attached image in the chat stream to open a zoomable, high-resolution modal viewer.

### CDP-Powered IDE Viewport Screencast
- **Live Visual Feed:** Periodic capture of the agent's browser or IDE workspace viewport.
- **Mobile Viewport Drawer:** Swipe open the viewport drawer on mobile to verify what the agent is currently seeing on the web or in the UI.

### Git Changes & File Diff Inspection
- **Git Review Route:** `/api/v1/git/diff` inspects uncommitted changes across your repository.
- **File Hierarchy Tree:** Shows modified, added, and deleted files with visual filetype icons.

---

## 4. System Requirements & Prerequisites

Ensure the following environments are installed on your host machine:

| Component | Minimum Version | Purpose |
| :--- | :--- | :--- |
| **Operating System** | Windows 10/11, macOS, Linux | Host development environment |
| **Python** | 3.12 or newer | Backend FastAPI server, adapters, and services |
| **Node.js & npm** | Node 20+, npm 10+ | Frontend React build pipeline and package management |
| **MongoDB Community** | 7.0 or newer | Local document database for sessions and event logs |
| **Tailscale** | Latest stable | Secure private encrypted mobile networking |
| **PowerShell** | 5.1+ (Windows) or pwsh 7+ | Automated build, test, and startup scripts |

---

## 5. Complete Step-by-Step Installation & Setup

### Step 1: Clone Repository & Virtual Environment Setup

Open PowerShell in your workspace root directory:

```powershell
# Run the automated initialization script
.\scripts\setup.ps1
```

*Manual alternative:*
```powershell
# Create Python virtual environment
python -m venv .venv

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Upgrade pip and install all backend dependencies
python -m pip install --upgrade pip
pip install -r requirements.txt
```

---

### Step 2: Configuration & Environment Variables

Copy the provided template to create your `.env` file (automatically performed by `setup.ps1` if absent):

```powershell
Copy-Item .env.example .env
```

Open `.env` and configure your settings:

```ini
# --- Server Settings ---
HOST=127.0.0.1
PORT=8000
ENVIRONMENT=development
LOG_LEVEL=INFO

# --- Security & Authentication ---
# Password used to log in from your mobile browser
APP_PASSWORD=ChooseAStrongPassword123!
# Secret key used to sign JWT auth cookies
JWT_SECRET=replace_with_a_secure_random_hex_string_in_production
ALLOWED_ORIGINS=*

# --- Local MongoDB Configuration ---
MONGODB_URI=mongodb://127.0.0.1:27017/
MONGODB_DATABASE=AgentWatch_v2
MONGODB_CONNECT_TIMEOUT_MS=3000
MONGODB_SERVER_SELECTION_TIMEOUT_MS=3000

# --- Antigravity Remote Debugging (CDP) ---
CDP_PORTS=9000,9001,9002,9003
CDP_DISCOVERY_INTERVAL_SEC=3
ANTIGRAVITY_INTEGRATION_MODE=environment_and_cdp

# --- Tailscale Configuration ---
TAILSCALE_SERVE_ENABLED=true
TAILSCALE_LOCAL_PORT=8000
```

---

### Step 3: Compiling the Frontend Client

AgentWatch's FastAPI server serves the pre-compiled, optimized React dashboard from `static/dist/`. Compile it using:

```powershell
# Navigate into the frontend folder
cd frontend

# Install client packages (React 19, Tailwind CSS 4, Lucide)
npm install

# Build static production bundle into static/dist
npm run build

# Return to repository root
cd ..
```

---

### Step 4: Running System Diagnostics

Before starting the server, run the system doctor to verify that MongoDB is running, ports are free, and dependencies are intact:

```powershell
.\scripts\doctor.ps1
```

If MongoDB is installed as a service but not running, start it:
```powershell
Start-Service MongoDB
```

---

### Step 5: Launching the Application

Start the AgentWatch backend service:

```powershell
.\scripts\start.ps1
```

*Manual alternative:*
```powershell
$env:PYTHONPATH = (Get-Location).Path
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Once started:
1. Open your desktop browser to **`http://127.0.0.1:8000`**.
2. If prompted, enter the `APP_PASSWORD` configured in your `.env`.
3. You are now connected to live agent monitoring!

To stop the server:
```powershell
.\scripts\stop.ps1
```

---

## 6. Mobile Remote Access via Tailscale

### Why Tailscale?
Tailscale creates a secure, encrypted peer-to-peer mesh network (Tailnet) between your computer and mobile phone. 
- **No Port Forwarding:** Never opens router ports.
- **No Public Exposure:** The server is only accessible to devices logged into your personal Tailscale account.
- **Zero Configuration HTTPS:** Tailscale provides automatic valid TLS certificates for your machine.

### Configuration Steps

1. **Install Tailscale** on both your workstation and your mobile phone (available on iOS and Android).
2. **Log in** to both devices using the same Tailscale account.
3. Check your workstation's Tailscale connection:
   ```powershell
   .\scripts\remote-status.ps1
   ```
4. **Enable Tailscale Serve** (exposes port 8000 securely to your Tailnet):
   ```powershell
   tailscale serve --bg 8000
   ```
   > ⚠️ **IMPORTANT SECURITY NOTE:** Do **NOT** use `tailscale funnel`. `tailscale serve` keeps access restricted to your authenticated private devices only. `funnel` makes it public to the entire internet.
5. **Open on Your Mobile Device:**
   - In your mobile browser (Safari, Chrome), visit your machine's tailnet domain (e.g. `https://my-desktop.tailnet-xyz.ts.net`).
   - Log in using your `APP_PASSWORD`.
   - Tap your browser's **"Add to Home Screen"** button to install AgentWatch as a full-screen mobile app!

---

## 7. Operational Management & PowerShell Scripts

The `scripts/` directory contains convenient PowerShell utilities to automate everyday operations:

| Script | Purpose |
| :--- | :--- |
| **`setup.ps1`** | Bootstraps the Python `.venv`, installs requirements, and sets up `.env`. |
| **`doctor.ps1`** | Performs health checks on Python, MongoDB, port bindings, and directory paths. |
| **`start.ps1`** | Safely launches the Uvicorn server on `127.0.0.1:8000` using the local virtual environment. |
| **`stop.ps1`** | Locates and cleanly terminates any active AgentWatch or port 8000 listener processes. |
| **`remote-status.ps1`** | Inspects Tailscale daemon status, IP addresses, and active serve proxies. |
| **`check_privacy.py`** | Scans logs, databases, and code trees for accidental token or secret leakage. |

---

## 8. Repository Map & Codebase Anatomy

```
AgentWatchV2/
├── api/
│   └── routes/                  # Modular FastAPI HTTP route controllers
│       ├── attachments.py       # Handles file/image uploads & metadata serving
│       ├── auth.py              # Cookie-based authentication & token validation
│       ├── controls.py          # Remote agent actions (pause, resume, prompt, model)
│       ├── diagnostics.py       # System health, log tailing, & self-tests
│       ├── events.py            # Event ingestion with SHA-256 deduplication
│       ├── git_review.py        # Repository git status and unified diff viewer
│       ├── health.py            # Kubernetes-style liveness/readiness probes
│       ├── interactions.py      # Agent decision, options, and question state
│       └── sessions.py          # Session tracking, history chats, and timelines
├── config/                      # Settings & database lifecycle
│   ├── database.py              # PyMongo client, connection pool, index schemas
│   └── settings.py              # Pydantic BaseSettings loading from .env
├── frontend/                    # Modern React 19 client application
│   ├── src/
│   │   ├── components/          # Modular UI components
│   │   │   ├── chat/            # Chat stream, turn items, diff viewers, approvals
│   │   │   ├── drawers/         # Navigation, sessions, and viewport drawer
│   │   │   ├── modals/          # Full-screen ApprovalModal and InteractionModal
│   │   │   └── PromptComposer.jsx # Multi-modal input bar with clipboard paste
│   │   ├── constants/           # Lucide icon mappings and filetype definitions
│   │   ├── hooks/               # useAgentWatch (real-time WebSocket & state)
│   │   └── services/            # Typed REST API and WebSocket client handlers
│   ├── package.json             # Frontend dependencies & scripts
│   └── vite.config.js           # Vite build pipeline outputting to static/dist
├── integrations/
│   └── antigravity/             # Antigravity IDE adapter & CDP remote control
│       ├── adapter.py           # Process monitoring and environment discovery
│       └── cdp_actions.py       # Chrome DevTools Protocol automation for approvals
├── models/                      # Pydantic schemas, domain objects, and request models
├── repositories/                # PyMongo data access objects
├── scripts/                     # Automated PowerShell maintenance scripts
├── security/                    # Token redaction engine & authentication middleware
├── services/                    # Core business logic services
│   ├── conversation_service.py  # Transcript parsing & step extraction
│   ├── diff_helper.py           # Unified diff computation for file edits
│   ├── interaction_service.py   # Question lifecycle and decision state manager
│   ├── log_buffer.py            # In-memory diagnostic ring buffer
│   └── websocket_manager.py     # Live bidirectional WebSocket broadcaster
├── static/                      # Static assets, fallback login, & compiled dist bundle
├── tests/                       # Automated test suite (pytest)
│   ├── unit/                    # Unit tests for services and parsers
│   └── integration/             # End-to-end API and route tests
└── main.py                      # FastAPI application entry point & lifespan
```

---

## 9. Testing, Diagnostics & Privacy Validation

### Automated Pytest Suite
Run all unit and integration tests:

```powershell
.\.venv\Scripts\python.exe -m pytest -v
```

### Privacy & Secret Leakage Scanner
Verify that your database and logs do not contain unredacted secrets or bearer tokens:

```powershell
.\.venv\Scripts\python.exe scripts\check_privacy.py
```

### Frontend Code Quality
Check frontend linting:

```powershell
cd frontend
npm run lint
cd ..
```

---

## 10. Troubleshooting & FAQ

### 1. I open `http://127.0.0.1:8000` and see "Static frontend not found"
- **Cause:** The React application has not been compiled yet.
- **Fix:** Run `cd frontend; npm install; npm run build; cd ..`. Verify that `static/dist/index.html` exists.

### 2. Port 8000 is already in use
- **Cause:** A previous instance of AgentWatch or another web server is still running.
- **Fix:** Execute `.\scripts\stop.ps1` to cleanly kill any process occupying port 8000.

### 3. MongoDB Connection Warning
- **Symptom:** Server logs show `MongoDB not immediately reachable at startup`.
- **Fix:** Ensure MongoDB Community Server is installed and running. Start it in PowerShell using `Start-Service MongoDB`.

### 4. CDP Actions / Approvals are not clicking buttons in Antigravity
- **Cause:** Antigravity must be launched with remote debugging enabled (e.g. `--remote-debugging-port=9000`).
- **Fix:** Ensure Antigravity IDE is running on your machine. AgentWatch scans ports `9000-9003` automatically.

### 5. Mobile browser displays "Cannot connect" or SSL warning over Tailscale
- **Fix:** Ensure you are using `tailscale serve --bg 8000` (which assigns a valid TLS certificate for your Tailnet name) and verify both your phone and PC are connected to Tailscale.

---

## 📄 License & Integrity

AgentWatch is designed for developer productivity, personal observability, and secure remote agent supervision. All intellectual property, code files, and user logs remain completely local on the user's host machine.
