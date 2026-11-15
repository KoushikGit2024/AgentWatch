# Comprehensive Multi-IDE Adaptation & DOM Migration Blueprint

**Document Location:** `migration/Migration.md`  
**Target Audience:** Autonomous Coding Agents & Core Developers  
**Scope:** Complete architectural reference for adapting AgentWatch to **any** AI-assisted desktop IDE (VS Code, Cursor, Windsurf, JetBrains, or new Antigravity releases).

---

> ### Mandatory Directive for Any AI Agent Reading This File:
>
> When you read this guide to adapt AgentWatch for a target IDE, **immediately notify the user in your response**:  
> _"I have thoroughly reviewed `migration/Migration.md`. I understand the dual-engine architecture (CDP webview automation + local OS/storage watchers), the specific selectors required, and the troubleshooting protocol. Let's inspect the target IDE via Chrome DevTools together so we can adapt the selectors, variables, and collectors for your environment."_

---

## Table of Contents

1. [Core Architectural Philosophy & Freedom to Refactor](#1-core-architectural-philosophy--freedom-to-refactor)
2. [Dual-Engine Data Gathering Architecture](#2-dual-engine-data-gathering-architecture)
   - [2.1 Engine 1: Local Storage, SQLite & OS Process Watcher](#21-engine-1-local-storage-sqlite--os-process-watcher)
   - [2.2 Engine 2: Chrome DevTools Protocol (CDP) Webview Automation](#22-engine-2-chrome-devtools-protocol-cdp-webview-automation)
   - [2.3 Real-time WebSocket Ingestion & Push Loop](#23-real-time-websocket-ingestion--push-loop)
3. [Exhaustive DOM Selector & Action Matrix](#3-exhaustive-dom-selector--action-matrix)
   - [3.1 Prompt Composer & Submission Engine](#31-prompt-composer--submission-engine)
   - [3.2 Stop Generation Dispatcher](#32-stop-generation-dispatcher)
   - [3.3 AI Model & Reasoning Effort Selector](#33-ai-model--reasoning-effort-selector)
   - [3.4 Question Answering & Choice Disambiguation](#34-question-answering--choice-disambiguation)
   - [3.5 Tool & Shell Command Approvals](#35-tool--shell-command-approvals)
   - [3.6 Queued Messages Card Inspector](#36-queued-messages-card-inspector)
   - [3.7 Conversation History & Session Switching](#37-conversation-history--session-switching)
   - [3.8 Terminal Task Peeking & Process Termination](#38-terminal-task-peeking--process-termination)
   - [3.9 Viewport Screenshot Capture & Mobile Sync](#39-viewport-screenshot-capture--mobile-sync)
4. [Endpoint Health Checklist & Failure Correlator](#4-endpoint-health-checklist--failure-correlator)
5. [Interactive Browser DevTools Protocol (User Collaboration)](#5-interactive-browser-devtools-protocol-user-collaboration)
6. [Adapter Creation Blueprint: Step-by-Step for a New IDE](#6-adapter-creation-blueprint-step-by-step-for-a-new-ide)
7. [Directory & Relative File Index](#7-directory--relative-file-index)

---

## 1. Core Architectural Philosophy & Freedom to Refactor

AgentWatch is designed to be **pluggable, modular, and unopinionated about the specific IDE**.

### Freedom to Rename Variables and Adapt Logic:

As an agent or developer adapting AgentWatch for a new IDE (e.g., Cursor, Windsurf, JetBrains Fleet, or VS Code):

- **You are fully authorized and encouraged to rename internal variables, module names, configurations, and method signatures** to accurately match the terminology and storage conventions of the target IDE.
- If the target IDE uses different status identifiers (e.g., `"running"` instead of integer `6`, or `"agent_state"` instead of `"action_lifecycle"`), **modify the parser logic directly** in `services/transcripts/` or `integrations/`.
- If the IDE stores chat transcripts in JSON files, LevelDB, SQLite, or exposes them via a local socket/HTTP daemon rather than JSONL, **refactor the service classes accordingly**.
- Adhere strictly to the project rule in `AGENTS.md`: **Keep all code files under 500 lines of code** (decompose at 400 lines into specialized helper sub-modules).

---

## 2. Dual-Engine Data Gathering Architecture

AgentWatch does not rely solely on scraping the UI, nor does it rely solely on static logs. It utilizes a **hybrid dual-engine architecture**:

```
+---------------------------------------------------------------------------------------------------+
|                                        AgentWatch Backend                                         |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  [ENGINE 1: Storage, DB & OS Watchers]             [ENGINE 2: Live CDP Webview Driver]            |
|  - SQLite DBs (~/.gemini/antigravity/... or        - Chrome DevTools Protocol Client              |
|    ~/.cursor/..., ~/.vscode/...)                     (Default Port: 9000; Scans 9001-9003, 9222)   |
|  - JSON Lines: transcript.jsonl & logs             - Injects JS directly into the Webview DOM     |
|  - Protobuf Step Blobs (task_details)              - Captures raw JPEG viewports (zero overhead)  |
|  - OS Process Tree: psutil process inspection      - Simulates focus, keyboard & click events     |
|  - Git CLI: repository branch graph & rev-list     - Interrogates popup menus & approval modals   |
|                                                                                                   |
+---------------------------------------------------------------------------------------------------+
                                  |                                   |
                                  v                                   v
                    [Local Disk & Windows OS]             [IDE Electron / Chromium DOM]
```

### 2.1 Engine 1: Local Storage, SQLite & OS Process Watcher

- **Conversation State & History (`services/chat/conversation_history_service.py`)**:
  - Primary source: Reads SQLite databases in `~/.gemini/antigravity/conversations/` or `conversation_summaries.db`.
  - Fallback: Scans project-level `.system_generated/logs/transcript.jsonl`.
- **Background Tasks & Daemons (`services/monitoring/task_monitor_service.py`)**:
  - Connects to conversation SQLite database and queries the `steps` table:
    ```sql
    SELECT step_id, task_details, status FROM steps WHERE status IN (2, 6) ORDER BY step_id DESC;
    ```
    - `status = 6`: Active in-flight background command execution.
    - `status = 2`: Persistent background daemon (e.g. `uvicorn main:app`).
  - Calls `services/monitoring/task_proto_helper.py` (pure Python protobuf decoder) to extract:
    - Field 1: `task_id` (e.g. `task-35462`)
    - Field 2: `log_uri` (file path to output log)
    - Field 4: `command` (exact shell command executed)
    - Field 6: `is_daemon` (boolean)
    - Field 7: `summary` (human-readable title)
  - Matches command signatures against `psutil.process_iter()` to discover the exact OS `pid`, process start timestamp (`started_at`), and verify liveness.
  - To terminate a task, `kill_task_process(pid)` recursively halts all child processes in the process tree.
- **Dynamic Workspace Resolution (`services/workspace/workspace_context.py`)**:
  - Decodes `file://` URIs from conversation step metadata to identify which folder on disk belongs to the current chat session.

### 2.2 Engine 2: Chrome DevTools Protocol (CDP) Webview Automation

- **Target Finder & Connection (`integrations/antigravity/core/target_finder.py`, `cdp_connection.py`)**:
  - Connects via HTTP loopback to `http://127.0.0.1:9000/json/list` (and probe ports `9001-9003`, `9222`).
  - Filters out background extensions, devtools windows, and telemetry workers.
  - Evaluates Javascript inside the active chat webview using `Runtime.evaluate`.
- **Viewport Frame Buffer (`integrations/antigravity/core/screenshot_service.py`)**:
  - Invokes CDP `Page.captureScreenshot` with JPEG compression (quality: 75).
  - Computes an MD5 hash of the frame buffer. If unchanged, returns an HTTP 304 or ~50 byte payload to prevent mobile bandwidth exhaustion.

### 2.3 Real-time WebSocket Ingestion & Push Loop

- **File:** `services/transcripts/transcript_watcher.py`
  - Runs a lightweight asynchronous loop every ~350ms.
  - Monitors file modification timestamps (`mtime`) and byte sizes of `transcript.jsonl`.
  - Probes the DOM via CDP every 3rd tick (~1s) for unexpected native popup alerts.
  - Broadcasts structured payloads (`chat_update`, `queue_update`, `approval_request`) across active WebSocket client connections (`services/networking/websocket_manager.py`).

---

## 3. Exhaustive DOM Selector & Action Matrix

Every action supported by AgentWatch maps to a dedicated CDP module under `integrations/antigravity/cdp/`. Below is the complete specification of elements, queries, and fallback strategies.

### 3.1 Prompt Composer & Submission Engine

- **Module:** `integrations/antigravity/cdp/cdp_prompt_actions.py`
- **Route:** `POST /api/v1/send` / `POST /api/v1/prompt`
- **Execution Strategy:**
  1. Locates input element via candidate selectors:
     - `div[contenteditable="true"][role="textbox"]`
     - `textarea[data-testid="chat-input"]`
     - `[aria-label="Message input"]`
     - Fallback: `textarea.monaco-inputbox`, `div.chat-input`, `[role="textbox"]`
  2. Dispatches `DOM.focus` or `.focus()` via Javascript.
  3. Inserts text using CDP `Input.insertText` (or sets `.value` / `textContent` with simulated `input` and `change` events).
  4. Locates send button:
     - `button[data-testid="send-button"]`
     - `[aria-label="Send message"]` / `[aria-label="Send Message"]`
     - Fallback: `button.chat-send-btn`, `button[type="submit"]`
  5. Clicks button or dispatches `Enter` (`keyCode: 13`) event.

### 3.2 Stop Generation Dispatcher

- **Module:** `integrations/antigravity/cdp/cdp_prompt_actions.py`
- **Route:** `POST /api/v1/stop`
- **Execution Strategy:**
  1. Queries visible stop button:
     - `button[data-testid="stop-button"]`
     - `button[aria-label="Stop generation"]`
     - `button[aria-label="Stop"]`
     - `button[aria-label="Cancel"]`
  2. If found, dispatches mouse click event.
  3. Fallback: Dispatches `Escape` key event (`Input.dispatchKeyEvent`) to cancel active generation.

### 3.3 AI Model & Reasoning Effort Selector

- **Module:** `integrations/antigravity/cdp/cdp_model_actions.py`
- **Routes:** `GET /api/v1/models/scan`, `POST /api/v1/set-model`, `POST /api/v1/set-mode`
- **Execution Strategy:**
  1. **Scan Trigger:** Clicks `button[data-testid="model-selector-trigger"]` or element matching `aria-label*="Select model"`.
  2. **Overlay Detection:** Locates popup container:
     - `div[role="menu"].agy-overlay`
     - `div[role="menu"]`
     - `.monaco-menu`, `.quick-input-widget`
  3. **Extract Items:** Scans `[role="menuitem"]`, `.monaco-list-row`, or `[data-testid*="model-option"]`. Extracts text content, tier badges, and selection checkmarks.
  4. **Select Model:** Clicks item whose normalized text matches target model (e.g., `gemini-1.5-pro`, `claude-3-5-sonnet`, `o1-preview`).
  5. **Effort Mode:** Locates toggle group `[data-testid="model-selector-effort-group"]` to toggle between **Fast** and **Planning**.

### 3.4 Question Answering & Choice Disambiguation

- **Module:** `integrations/antigravity/cdp/cdp_question_actions.py`
- **Route:** `POST /api/v1/interactions/{id}/respond`
- **Execution Strategy:**
  1. Scopes search to active dialog:
     - `[role="dialog"]`, `[role="radiogroup"]`, `[data-testid*="ask-question"]`
     - Fallback: `.quick-input-widget`, `.monaco-dialog-box`
  2. Scans choice elements:
     - `button`, `[role="radio"]`, `[role="button"]`, `.monaco-list-row`
  3. Matches choice label using fuzzy string equality (e.g. matching `"Approach A"` while stripping `"(Recommended)"` decorators).
  4. Dispatches click sequence.
  5. Clicks confirmation button (`Submit`, `OK`, `Continue`, `Apply`).
  6. **Custom "Type Something Else" Option:** If user selected custom write-in, clicks custom button (or `input[placeholder*="Other"]`), enters text, and submits.

### 3.5 Tool & Shell Command Approvals

- **Module:** `integrations/antigravity/cdp/cdp_forward_approval.py`, `cdp_approval_actions.py`
- **Route:** `POST /api/v1/approvals/respond`
- **Execution Strategy:**
  1. **Disambiguated Button Classification:**
     - **Always Allow:** Searches for buttons containing `always` (`always allow`, `always run`, `allow all`). If nested in a split-button dropdown, clicks the dropdown chevron to expose the "Always" option.
     - **Allow (Once):** Searches for buttons containing `allow`, `run`, `accept`, `execute` — explicitly filtering out any button that contains the word `always`.
     - **Deny / Reject:** Searches for buttons containing `deny`, `reject`, `cancel`, `dismiss`.
  2. **Custom Instructions on Rejection:** If the user provided custom text guidance with a Deny or Allow action, clicks the decision button, focuses the composer input, and sends the custom text.

### 3.6 Queued Messages Card Inspector

- **Module:** `integrations/antigravity/cdp/cdp_queue_actions.py`
- **Routes:** `GET /api/v1/chat/queued`, `POST /api/v1/chat/queued/send-now`, `DELETE /api/v1/chat/queued/{id}`
- **Execution Strategy:**
  1. Locates container: `[data-testid="queued-messages-card"]` or `.queued-messages-container`.
  2. Extracts rows: `div.min-h-7`, `[class*="min-h-7"]`, `.queued-item-row`.
  3. Extracts message body: `[data-quotable="true"]`, `.line-clamp-2`, `span.text-sm`.
  4. Actions: Clicks `button[aria-label*="Send now"]` or `button[aria-label*="Delete"]`.

### 3.7 Conversation History & Session Switching

- **Module:** `integrations/antigravity/cdp/cdp_session_actions.py`
- **Routes:** `POST /api/v1/switch-chat`, `POST /api/v1/new-chat`
- **Execution Strategy:**
  1. **Switch Chat:** Finds conversation row by attribute `[data-cascade-id="<conversation-id>"]` inside `[data-testid="conversation-list-sidebar"]` or `.history-sidebar` and triggers click.
  2. **New Chat:** Clicks `button[data-testid="new-chat-button"]` or `button[aria-label*="New Chat"]` (`button[title*="New Conversation"]`, `.codicon-plus`).

### 3.8 Terminal Task Peeking & Process Termination

- **Modules:** `services/monitoring/task_monitor_service.py`, `services/monitoring/task_proto_helper.py`, `integrations/antigravity/cdp/cdp_terminal_actions.py`
- **Routes:** `GET /api/v1/tasks?active_only=true`, `POST /api/v1/tasks/{pid}/kill`
- **Execution Strategy:**
  1. Queries SQLite step records for status `2` or `6`.
  2. Decodes protobuf blobs for command and log URI.
  3. Uses `psutil` to verify process liveness and find the active PID.
  4. `POST /api/v1/tasks/{pid}/kill` recursively terminates the process tree.

### 3.9 Viewport Screenshot Capture & Mobile Sync

- **Module:** `integrations/antigravity/core/screenshot_service.py`
- **Routes:** `GET /api/v1/snapshot`, `GET /api/v1/snapshot.jpg`, `POST /remote-scroll`
- **Execution Strategy:**
  1. Captures JPEG frame buffer via CDP `Page.captureScreenshot`.
  2. Handles mobile scroll synchronization: `POST /remote-scroll` receives vertical percentage (`scrollTopPercent`) and dispatches `Runtime.evaluate` to update `.scrollTop` on the IDE's scrollable container.

---

## 4. Endpoint Health Checklist & Failure Correlator

When adapting to a new IDE or troubleshooting an existing installation, use this diagnostic checklist:

| Check              | Route / Action                       | Success Criteria             | Failure Symptom           | Most Likely Root Cause                                             |
| :----------------- | :----------------------------------- | :--------------------------- | :------------------------ | :----------------------------------------------------------------- |
| **1. CDP Link**    | `GET /api/v1/diagnostics`            | `"cdp_connected": true`      | `"cdp_connected": false`  | Port 9000 not open; wrong target title in `target_finder.py`.      |
| **2. Snapshot**    | `GET /api/v1/snapshot`               | Returns base64 image data    | `status: "unavailable"`   | Chat webview target is sleeping, backgrounded, or URL changed.     |
| **3. Model Scan**  | `GET /api/v1/models/scan`            | Returns array of model names | Returns empty array `[]`  | Trigger selector `[data-testid="model-selector-trigger"]` missing. |
| **4. Prompt Send** | `POST /api/v1/send`                  | `"status": "submitted"`      | `"cdp_dispatch_failed"`   | Input box or submit button selector changed.                       |
| **5. Stop Signal** | `POST /api/v1/stop`                  | Agent generation halts       | Agent continues writing   | Stop button query changed; keyboard `Escape` not bound.            |
| **6. Approval**    | `POST /api/v1/approvals/respond`     | Action executes in IDE       | Modal remains open        | Button text differs or dialog is enclosed in a ShadowRoot.         |
| **7. New Chat**    | `POST /api/v1/new-chat`              | IDE opens fresh session      | Current chat remains open | New chat button selector changed.                                  |
| **8. Tasks**       | `GET /api/v1/tasks?active_only=true` | Returns tasks with PIDs      | Empty tasks list          | Step status codes differ or DB path differs.                       |

---

## 5. Interactive Browser DevTools Protocol (User Collaboration)

When adapting AgentWatch to a new IDE (e.g. Cursor, VS Code, Windsurf) or debugging broken selectors, execute this protocol with the user:

### Step 1: User Launches IDE with Debugging Port

Ask the user to start their IDE with the remote debugging argument:

```powershell
# Windows Example
& "C:\Path\To\YourIDE.exe" --remote-debugging-port=9000
```

### Step 2: User Connects via Chromium Browser

Instruct the user:

1. Open Google Chrome or any Chromium browser on the desktop.
2. Navigate to `http://localhost:9000`.
3. Locate the item corresponding to the **Agent Workbench** or **Chat Panel** and click it.
4. A full Chrome DevTools window will open, exposing the live DOM of the IDE.

### Step 3: Inspect DOM via User Element Hover or Console Audit

There are two collaborative ways to capture DOM elements for the target IDE. **Method A (User Element Hover & Copy)** is strongly recommended because it is faster, avoids false positives, and reveals the exact DOM hierarchy effortlessly.

#### Method A: Direct User Element Hover & Copy (Recommended)

Instruct the user:

1. In the open DevTools window (`http://localhost:9000`), click the **Inspect Element** cursor icon in the top-left corner (or press `Ctrl + Shift + C` on Windows/Linux or `Cmd + Shift + C` on macOS).
2. **Hover over and click** the target UI element inside the IDE window:
   - Chat input box / prompt composer
   - Submit / Send message button
   - Stop generation button
   - Model selection dropdown / pill
   - Approval dialog ("Allow", "Always Allow", "Deny" buttons)
   - Dynamic interaction / question response options
3. The corresponding HTML element will be highlighted in the **Elements** panel.
4. Instruct the user to **right-click the highlighted element** and choose:
   - **Copy > Copy outerHTML** (provides the full tag, classes, `data-testid`, and `aria-label` attributes)
   - _OR_ **Copy > Copy selector** (provides the exact browser CSS path)
5. Have the user paste that snippet directly into your chat. As an agent, extract the resilient selectors (preferring `data-testid`, `aria-label`, or unique class names) and apply them to the adapter modules.

#### Method B: Automated Comprehensive DOM Inspection Script (Fallback)

If the user prefers running a script across the entire document at once, ask the user to open the **Console** tab in DevTools, paste this script, and press Enter:

```javascript
(() => {
  const audit = {
    url: window.location.href,
    title: document.title,
    inputs: Array.from(
      document.querySelectorAll('textarea, input, [contenteditable="true"], [role="textbox"]')
    ).map(el => ({
      tagName: el.tagName,
      role: el.getAttribute("role"),
      testId: el.getAttribute("data-testid"),
      ariaLabel: el.getAttribute("aria-label"),
      placeholder: el.getAttribute("placeholder"),
      className: el.className,
    })),
    buttons: Array.from(document.querySelectorAll('button, [role="button"]'))
      .filter(b => b.offsetWidth > 0 && b.offsetHeight > 0)
      .map(b => ({
        text: b.innerText.trim().replace(/\n+/g, " "),
        testId: b.getAttribute("data-testid"),
        ariaLabel: b.getAttribute("aria-label"),
        title: b.title,
        className: b.className,
      })),
    dialogs: Array.from(
      document.querySelectorAll(
        '[role="dialog"], [role="radiogroup"], .quick-input-widget, .monaco-dialog-box'
      )
    ).map(d => ({
      role: d.getAttribute("role"),
      className: d.className,
      innerTextPreview: d.innerText.slice(0, 150),
    })),
    models: Array.from(
      document.querySelectorAll('[data-testid*="model"], [class*="model"], [aria-label*="model"]')
    ).map(m => ({
      testId: m.getAttribute("data-testid"),
      ariaLabel: m.getAttribute("aria-label"),
      text: m.innerText.trim(),
    })),
  };
  console.log("=== AGENTWATCH DOM AUDIT ===");
  console.log(JSON.stringify(audit, null, 2));
  return audit;
})();
```

### Step 4: Map Audit Results to AgentWatch Modules

- **Chat Input:** Copy the input's `data-testid`, `aria-label`, or class to `integrations/<ide>/cdp/cdp_prompt_actions.py`.
- **Send & Stop Buttons:** Map button selectors to `cdp_prompt_actions.py`.
- **Model Selector:** Map dropdown button to `cdp_model_actions.py`.
- **Approvals & Questions:** Map dialog selectors to `cdp_question_actions.py` and `cdp_forward_approval.py`.

---

## 6. Adapter Creation Blueprint: Step-by-Step for a New IDE

To add clean, first-class support for a new IDE (e.g. `integrations/cursor/` or `integrations/vscode/`):

1. **Create the Integration Package**:
   - Create directory `integrations/<ide_name>/` with subdirectories `cdp/`, `core/`, and `parsers/`.
2. **Implement Target Finder (`integrations/<ide_name>/core/target_finder.py`)**:
   - Customize URL and title matching patterns in `_score_target()` to identify the IDE's primary chat webview.
3. **Implement Adapter Class (`integrations/<ide_name>/core/adapter.py`)**:
   - Implement `send_prompt()`, `stop_generation()`, `capture_screenshot()`, `get_active_model()`, and `forward_approval()`.
4. **Implement Storage Watcher (`services/transcripts/` or `services/monitoring/`)**:
   - Locate where the IDE persists its session files (e.g. `~/.cursor/chats/` or SQLite `state.vscdb`).
   - Adapt `task_monitor_service.py` to query active background tasks from the new data format.
5. **Verify Without File Size Violations (`AGENTS.md`)**:
   - Verify every new or modified file remains strictly **under 500 lines**.
   - Compile frontend: `cd frontend; npm run build`.
   - Run tests: `pytest tests/`.

---

## 7. Directory & Relative File Index

For quick reference while coding or refactoring, these are the core files mentioned in this guide:

- **CDP Actions & Drivers:**
  - [cdp_prompt_actions.py](file:///d:/All%20Codes/AllProjects/AgentWatchV2/integrations/antigravity/cdp/cdp_prompt_actions.py) — Composer inputs, send and stop buttons.
  - [cdp_forward_approval.py](file:///d:/All%20Codes/AllProjects/AgentWatchV2/integrations/antigravity/cdp/cdp_forward_approval.py) — Native modal approval and split-button actions.
  - [cdp_model_actions.py](file:///d:/All%20Codes/AllProjects/AgentWatchV2/integrations/antigravity/cdp/cdp_model_actions.py) — Model dropdown triggers and effort switches.
  - [cdp_question_actions.py](file:///d:/All%20Codes/AllProjects/AgentWatchV2/integrations/antigravity/cdp/cdp_question_actions.py) — Single/multi-choice decision dialogs.
  - [cdp_queue_actions.py](file:///d:/All%20Codes/AllProjects/AgentWatchV2/integrations/antigravity/cdp/cdp_queue_actions.py) — Queued messages card inspection.
  - [cdp_session_actions.py](file:///d:/All%20Codes/AllProjects/AgentWatchV2/integrations/antigravity/cdp/cdp_session_actions.py) — History sidebar switching and new chat.
  - [cdp_terminal_actions.py](file:///d:/All%20Codes/AllProjects/AgentWatchV2/integrations/antigravity/cdp/cdp_terminal_actions.py) — Terminal DOM buttons.
  - [adapter.py](file:///d:/All%20Codes/AllProjects/AgentWatchV2/integrations/antigravity/core/adapter.py) — Central IDE adapter singleton.
  - [target_finder.py](file:///d:/All%20Codes/AllProjects/AgentWatchV2/integrations/antigravity/core/target_finder.py) — Target webview discovery and scoring.
  - [screenshot_service.py](file:///d:/All%20Codes/AllProjects/AgentWatchV2/integrations/antigravity/core/screenshot_service.py) — Frame buffer capture and hash caching.
- **Monitoring & Storage Services:**
  - [task_monitor_service.py](file:///d:/All%20Codes/AllProjects/AgentWatchV2/services/monitoring/task_monitor_service.py) — SQLite steps query and OS process tree killer.
  - [task_proto_helper.py](file:///d:/All%20Codes/AllProjects/AgentWatchV2/services/monitoring/task_proto_helper.py) — Pure Python protobuf step decoder.
  - [transcript_watcher.py](file:///d:/All%20Codes/AllProjects/AgentWatchV2/services/transcripts/transcript_watcher.py) — Live observation loop and WebSocket broadcasting.
  - [transcript_parser.py](file:///d:/All%20Codes/AllProjects/AgentWatchV2/services/transcripts/transcript_parser.py) — Parses JSONL steps into structured turns.
  - [workspace_context.py](file:///d:/All%20Codes/AllProjects/AgentWatchV2/services/workspace/workspace_context.py) — Dynamic active project folder resolver.
- **API Transport Routers:**
  - [controls.py](file:///d:/All%20Codes/AllProjects/AgentWatchV2/api/routes/system/controls.py) — Prompts, snapshots, stops, and terminal aliases.
  - [tasks.py](file:///d:/All%20Codes/AllProjects/AgentWatchV2/api/routes/system/tasks.py) — Task listing and PID termination routes.
  - [diagnostics.py](file:///d:/All%20Codes/AllProjects/AgentWatchV2/api/routes/system/diagnostics.py) — Health, CDP connection, and operation checks.
