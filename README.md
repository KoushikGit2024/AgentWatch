# AgentWatch 📱 — Local-First Antigravity Observer & Mobile Control Center

Monitor, approve, and steer your local **Google Antigravity** AI coding sessions in real time from any phone, tablet, or browser over private peer-to-peer networking—with zero cloud dependencies, ultra-low memory/bandwidth usage, and full bidirectional popup support.

## What AgentWatch Does

1. **Live Command & Tool Approval Popups (`ApprovalModal` & `ApprovalCard`)**:
   - Automatically detects commands waiting for approval (`SafeToAutoRun: False`, `BypassSandbox: True`, or live Antigravity DOM dialogs/quick-inputs).
   - Displays all available options (**Allow**, **Always Allow**, **Deny**, plus any dynamic options scraped from the IDE).
   - Includes a **"Type something else / Deny with instructions…"** input so you can reject a command (or approve it with a note) and immediately tell the agent what to do instead.
2. **Dynamic Agent Question Popups (`InteractionModal` & `PendingInteractionBanner`)**:
   - Captures `ask_question`, `notify_user`, and live IDE QuickInput option menus with single-choice, multi-choice, or free-text schemas.
   - Displays numbered options, descriptions, and `Recommended` badges alongside an explicit **"Type something else / Provide custom instructions…"** option.
   - Keeps popups active for as long as needed (exempt from the 7-second transcript inactivity timer) and supports minimizing to a sticky banner above the prompt composer.
3. **Web Push & Phone Lock-Screen Notifications (Native Service Worker + VAPID)**:
   - Receives instant, native push notifications on your phone (Android/iOS) or desktop even when your phone is locked or browser tab is completely closed.
   - Instant push alerts for critical **Command Approvals** and **Interactive Agent Prompts/Questions** with one-tap redirect to resolve them.
   - Zero-config automatic HTTPS setup via Tailscale Serve built directly into `run.ps1`.
4. **Request-Based Upward Scroll Lazy-Loading (`ChatStream.jsx` + `/api/v1/chat/messages`)**:
   - Loads only the latest **15 conversation turns** on startup (`limit=15`) for instant mobile rendering.
   - When you scroll up near the top of the stream, automatically requests the next older block (`GET /api/v1/chat/messages?limit=15&before=<oldest_index>`), prepends it into memory with **scroll anchoring** (zero screen jump), and keeps that block rendered.
   - Scrolling up again to the top of the newly loaded block triggers the next older batch repeatedly until the beginning of the conversation (`oldest_index === 0`) is reached.
5. **Low-Memory & Low-Bandwidth Architecture**:
   - **Screen-Only Hash-Deduplicated Snapshots:** `/snapshot` is only polled when you switch to the **Screen** tab (`viewMode === 'screen'`), passing `?last_hash=<md5>` so unchanged frames return a 50-byte `"unchanged"` status instead of re-sending 250 KB Base64 JPEGs.
   - **GZip Compression & Memoized Diffs:** FastAPI `GZipMiddleware` compresses all responses, `services/diff_helper.py` caches unified diffs in an `@lru_cache`, `ConversationService` caches parsed turns by `(mtime, size)`, and `ChatTurn` / `StreamItem` use `React.memo` + CSS `content-visibility: auto`.

## System Architecture & Data Flow

```
+-------------------------------------------------------------------------------+
|                           Your Local Workstation                              |
|                                                                               |
|  +--------------------------------+       +--------------------------------+  |
|  |     Antigravity Desktop IDE    |       |      Active Project Folder     |  |
|  |  - Agent Execution Engine      |       |  - Code Files & Diffs          |  |
|  |  - CDP Remote Debugging (9000) |       |  - Local Git Repository        |  |
|  +----------------+---------------+       +----------------+---------------+  |
|                   |                                        |                  |
|     Session Logs  | CDP DOM Probe,                         |LRU Cached Diffs  |
|   & Transcripts   | Option Clicks & Prompts                | & Git Review     |
|                   v                                        v                  |
|  +-------------------------------------------------------------------------+  |
|  |                         AgentWatch Backend (FastAPI)                    |  |
|  |                                                                         |  |
|  |  [Transcript Cache & Cursor Paginator]  [CDP Popup & Option Dispatcher] |  |
|  |                     |                                  |                |  |
|  |                     +----------------+-----------------+                |  |
|  |                                      v                                  |  |
|  |               [WebSocket Broadcast Bus + GZip REST API]                 |  |
|  |                                      |                                  |  |
|  |                                      v                                  |  |
|  |          [MongoDB Community Server + Automatic In-Memory Fallback]      |  |
|  +--------------------------------------+----------------------------------+  |
|                                         |                                     |
|                                         v                                     |
|                     [Tailscale Serve Encrypted HTTPS Proxy]                   |
+-----------------------------------------+-------------------------------------+
                                          |
                                          v
+-------------------------------------------------------------------------------+
|               Mobile Phone (Android / iOS) or Desktop Browser                 |
|  - Upward Lazy-Loaded Chat Stream (15 turns/block + Scroll Anchoring)         |
|  - Full-Screen Command Approval & Dynamic Question Modals + Custom Input      |
|  - Screen-Only Hash-Deduplicated Live IDE Viewport                            |
+-------------------------------------------------------------------------------+
```

## 📋 System Prerequisites (What to Install on Your Machine)

Before launching AgentWatch, make sure your machine has the following tools installed globally:

| Tool                   | Minimum Version | Required?       | Why It's Needed                                                                                                   |
| :--------------------- | :-------------- | :-------------- | :---------------------------------------------------------------------------------------------------------------- |
| **Python**             | 3.10+           | **Yes**         | Powers the FastAPI backend & WebSocket server. (All libraries install into repo `.venv`).                         |
| **Google Antigravity** | Any             | **Yes**         | The AI IDE you are monitoring with `--remote-debugging-port=9000`.                                                |
| **Node.js & npm**      | 18+             | **Optional**    | Pre-compiled bundle is included in `static/dist/`. Only needed if modifying frontend code.                        |
| **Tailscale**          | Any             | **Recommended** | Provides secure, private peer-to-peer HTTPS connection for mobile browser push notifications.                     |
| **MongoDB**            | 6.0+            | **Optional**    | For persistent history logs. If not installed, AgentWatch **automatically uses its built-in in-memory fallback**. |

> **Note on Python Packages:** You do **not** need to install Python libraries globally. When you run `run.bat` or `run.ps1`, all required packages (`fastapi`, `uvicorn`, `pywebpush`, `cryptography`, etc.) are downloaded and kept **strictly inside this repository's isolated `.venv/` directory**.

---

## 🚀 Getting Started & Launch Guide

### 1. One-Click Automated Launch (Windows — Recommended)

AgentWatch features a zero-configuration, self-healing launcher that automatically locates your Python and Node/NPM runtimes, builds the frontend if needed, frees port 8000 from stale instances, starts MongoDB, verifies Antigravity CDP, and opens your browser:

Simply double-click:

```bat
run.bat
```

Or run in PowerShell:

```powershell
.\run.ps1
```

---

### 2. Manual & Device-Wise Setup Guide

#### A. Windows 10 / 11 (PowerShell)

If you prefer running commands manually, copy-paste the block below:

```powershell
# 1. Run dynamic automated setup (locates Python 3.10+, creates .venv, installs requirements, generates .env)
.\scripts\setup.ps1

# 2. Build the React frontend (or skip if static/dist already exists)
if (Get-Command npm -ErrorAction SilentlyContinue) {
    cd frontend; npm run build; cd ..
}

# 3. Start MongoDB if installed (optional: AgentWatch has automatic in-memory fallback)
Start-Service MongoDB -ErrorAction SilentlyContinue

# 4. Restart Antigravity with Remote Debugging Port 9000 enabled
Stop-Process -Name "Antigravity*" -Force -ErrorAction SilentlyContinue
$agExe = "$env:LOCALAPPDATA\Programs\Antigravity IDE\Antigravity IDE.exe"
if (-not (Test-Path $agExe)) { $agExe = "$env:LOCALAPPDATA\Programs\Antigravity\Antigravity.exe" }
if (-not (Test-Path $agExe)) { $agExe = (Get-Command antigravity -ErrorAction SilentlyContinue).Source }
if ($agExe -and (Test-Path $agExe)) {
    Start-Process $agExe -ArgumentList "--remote-debugging-port=9000"
}

# 5. Start AgentWatch Backend on http://127.0.0.1:8000
.\scripts\start.ps1
```

**Run AgentWatch Silently in the Background on Windows (Safe to Close PowerShell):**

```powershell
$py = (Join-Path (Get-Location).Path ".venv\Scripts\python.exe")
Start-Process $py -ArgumentList "-m uvicorn main:app --host 127.0.0.1 --port 8000" -WorkingDirectory (Get-Location).Path -WindowStyle Hidden
```

### 2. macOS (Apple Silicon M1/M2/M3/M4 & Intel — zsh / bash)

Open **Terminal** in the project root folder and copy-paste:

```bash
# 1. Create and activate Python virtual environment
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install --upgrade pip
pip install -r requirements.txt

# 2. Create .env file if missing
if [ ! -f .env ]; then
cat << 'EOF' > .env
HOST=127.0.0.1
PORT=8000
ENVIRONMENT=development
LOG_LEVEL=INFO
APP_PASSWORD=ChangeMe123!
JWT_SECRET=agentwatch_local_secret_key_change_in_prod
MONGODB_URI=mongodb://127.0.0.1:27017/
MONGODB_DATABASE=AgentWatch_v2
CDP_PORTS=9000,9001,9002,9003
EOF
fi

# 3. Build the React frontend bundle into static/dist
cd frontend
npm install
npm run build
cd ..

# 4. Start MongoDB via Homebrew (if installed)
brew services start mongodb-community 2>/dev/null || true

# 5. Quit any existing Antigravity instance so port 9000 flag is honored, then relaunch
killall "Antigravity" 2>/dev/null || true
open -a "Antigravity" --args --remote-debugging-port=9000

# 6. Start AgentWatch server
export PYTHONPATH="$(pwd)"
python3 -m uvicorn main:app --host 127.0.0.1 --port 8000
```

### 3. Linux (Ubuntu / Debian / Fedora / Arch)

Open your Linux terminal in the project root folder and copy-paste:

```bash
# 1. Setup Python virtual environment & dependencies
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install --upgrade pip
pip install -r requirements.txt

# 2. Build the React frontend bundle
cd frontend
npm install
npm run build
cd ..

# 3. Start MongoDB (optional — automatic in-memory fallback is built-in)
sudo systemctl start mongod 2>/dev/null || true

# 4. Restart Antigravity with CDP port 9000 enabled
pkill -f antigravity 2>/dev/null || true
nohup antigravity --remote-debugging-port=9000 >/dev/null 2>&1 &

# 5. Start AgentWatch server
export PYTHONPATH="$(pwd)"
python3 -m uvicorn main:app --host 127.0.0.1 --port 8000
```

### 4. Windows Subsystem for Linux (WSL2)

If you run `AgentWatch` inside **WSL2** while **Antigravity IDE** runs on the Windows desktop:

1. **Enable Mirrored Networking** (so WSL2 and Windows share `127.0.0.1:9000` seamlessly). Run this in **Windows PowerShell**:
   ```powershell
   @"
   [wsl2]
   networkingMode=mirrored
   localhostForwarding=true
   "@ | Out-File -FilePath "$env:USERPROFILE\.wslconfig" -Encoding utf8
   wsl --shutdown
   ```
2. **Symlink your Windows Antigravity Transcript Directory inside WSL2** so `ConversationService` reads your live Windows transcripts:
   ```bash
   WIN_USER=$(cmd.exe /c "echo %USERNAME%" 2>/dev/null | tr -d '\r')
   mkdir -p ~/.gemini/antigravity-ide
   ln -sfn "/mnt/c/Users/${WIN_USER}/.gemini/antigravity-ide/brain" ~/.gemini/antigravity-ide/brain
   ```
3. Launch Antigravity on Windows with `--remote-debugging-port=9000` and start AgentWatch inside WSL2 using the Linux commands above.

### 5. Android Phone / Tablet & iPhone / iPad (iOS) Setup

#### Option A: Secure Anywhere Access via Tailscale (Recommended — Works on Mobile Data & Wi-Fi)

1. Install **Tailscale** on your workstation and on your Android / iOS device, and sign in to the same account.
2. On your workstation, expose port `8000` privately inside your Tailnet with automatic HTTPS:
   ```bash
   tailscale serve --bg 8000
   tailscale serve status
   ```
3. Copy the `https://<your-machine>.<tailnet>.ts.net` URL printed by `tailscale serve status` and open it in **Chrome (Android)** or **Safari (iOS)**.
4. Log in with your `APP_PASSWORD`, then install as a full-screen app:
   - **Android (Chrome):** Tap the **⋮** menu → **Add to Home screen** → **Install**.
   - **iPhone / iPad (Safari):** Tap the **Share** button (`↑`) → **Add to Home Screen** → **Add**.

#### Option B: Same-Room Local Wi-Fi Access (No Tailscale Needed)

1. Start Uvicorn bound to `0.0.0.0` instead of `127.0.0.1`:
   - **Windows PowerShell:**
     ```powershell
     New-NetFirewallRule -DisplayName "AgentWatch LAN 8000" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow -Profile Private -ErrorAction SilentlyContinue
     .\.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000
     ```
   - **macOS / Linux:**
     ```bash
     python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
     ```
2. Find your workstation's local Wi-Fi IP (`ipconfig` on Windows, `ipconfig getifaddr en0` on macOS, `hostname -I` on Linux) and open `http://<WORKSTATION_LAN_IP>:8000` on your phone.

## Edge Cases & Device-Specific Troubleshooting Matrix

| Symptom / Edge Case                                                                            | Why It Happens                                                                                                                                                                                                 | Exact Copy-Paste Solution                                                                                                                                                                                                                                                                                                   |
| :--------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Antigravity was started with `--remote-debugging-port=9000`, but port 9000 is still closed** | Electron single-instance lock: an existing Antigravity window or tray process was already running without the flag, so the new launch just focused the old process and ignored `--remote-debugging-port=9000`. | **Windows:** `Stop-Process -Name "Antigravity*" -Force; Start-Process "antigravity" -ArgumentList "--remote-debugging-port=9000"`<br>**macOS:** `killall "Antigravity"; open -a "Antigravity" --args --remote-debugging-port=9000`<br>**Linux:** `pkill -f antigravity && nohup antigravity --remote-debugging-port=9000 &` |
| **Opening `http://127.0.0.1:8000` shows `"Static frontend not found"`**                        | The Vite production bundle (`static/dist/index.html`) hasn't been compiled yet.                                                                                                                                | Run `cd frontend && npm install && npm run build && cd ..` and refresh the browser.                                                                                                                                                                                                                                         |
| **Command Approval or Question Popup used to disappear after 7 seconds**                       | Previously, `is_stale_inactivity` marked the turn done after 7s of idle transcript time.                                                                                                                       | **Fixed in this build:** `ConversationService` now exempts pending command approvals and unanswered agent questions from the 7-second inactivity timer until resolved.                                                                                                                                                      |
| **Clicking "Allow" vs "Always Allow" clicked the wrong button or missed split-dropdowns**      | Both terms shared a flat substring matcher, and split-button dropdown chevrons were not expanded.                                                                                                              | **Fixed in this build:** `dispatch_forward_approval()` scores exact labels separately and automatically expands split-button dropdown menus when `Always Allow` is nested.                                                                                                                                                  |
| **Want to reject a command and tell the agent what to do instead**                             | Binary Allow/Deny didn't pass follow-up context to the agent.                                                                                                                                                  | **Fixed in this build:** Tap **"Type something else / Deny with instructions…"** inside `ApprovalModal` or `ApprovalCard`, type your guidance, and tap **Deny & Send Instructions** (or **Allow + Send Note**).                                                                                                             |
| **Scrolling up in a long session used to lag or jump the scroll position**                     | All 50 turns were rendered at once without memoization or scroll anchoring.                                                                                                                                    | **Fixed in this build:** Only 15 turns load initially. Scrolling near the top fetches the next 15-turn block via `?before=<oldest_index>`, anchors `scrollTop`, and keeps loaded blocks in memory.                                                                                                                          |
| **MongoDB is not installed or stopped on my laptop**                                           | `127.0.0.1:27017` is unreachable.                                                                                                                                                                              | `InteractionRepository` automatically falls back to its built-in in-memory store (`_fallback_store`), so live chat streaming, command approvals, and question popups work even without MongoDB running.                                                                                                                     |
| **Phone screen locks and WebSocket disconnects**                                               | Mobile OS suspends background tab sockets to save battery.                                                                                                                                                     | **Fixed in this build:** All background timers pause while `document.hidden` is true (saving battery and data) and immediately resync chat, approvals, and interactions the moment you unlock your phone.                                                                                                                   |

## Verification & Testing Commands

```bash
# Compile-check all Python modules
python3 -m py_compile main.py api/routes/controls.py services/conversation_service.py services/interaction_service.py services/diff_helper.py integrations/antigravity/cdp_actions.py integrations/antigravity/adapter.py

# Run pytest suite
pytest -v

# Trigger a live test Command Approval Popup in your connected phone browser
curl -X POST "http://127.0.0.1:8000/api/v1/approvals/test-popup"
```
