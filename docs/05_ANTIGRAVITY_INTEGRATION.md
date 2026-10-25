# 05 — Antigravity Integration & CDP Adapter

**Document ID:** CW-DOC-005  
**Version:** 2.0.0  
**Project:** AgentWatch  
**Classification:** Integration & Adapter Specification  

---

## 1. Overview of Antigravity Integration

**Google Antigravity** is built upon modern web and desktop technologies (Electron / Chromium / Node.js). To enable rich remote observation, mobile interaction, and viewport mirroring without injecting invasive binary patches into the IDE, AgentWatch interfaces with Antigravity through two distinct, complementary channels:

1. **The Chrome DevTools Protocol (CDP) Adapter (Observation & UI Synchronization):**  
   Connects via HTTP and WebSockets to Chromium's remote debugging interface to capture live DOM snapshots, extract stylesheets, evaluate mode states, and synchronize viewport scrolling.
2. **The Telemetry & Event Ingestion API (Deterministic State & Auditing):**  
   Provides HTTP endpoints (`/api/v1/events/ingest`) where Antigravity hooks, sidecars, or plugin scripts deliver structured events (`PreToolUse`, `PostToolUse`, `AgentMessage`, `Stop`).

---

## 2. Chrome DevTools Protocol (CDP) Discovery Architecture

### Discovery Lifecycle
When Antigravity is launched with remote debugging enabled (`--remote-debugging-port=9000`), the embedded Chromium browser exposes an HTTP discovery endpoint at `http://127.0.0.1:9000/json/list`.

The `AntigravityAdapter` (`integrations/antigravity/adapter.py`) executes the following discovery workflow:

```
[AntigravityAdapter.discover_cdp()]
               |
               v
    Scan ports in settings.parsed_cdp_ports (9000, 9222)
               |
               +---> Try GET http://127.0.0.1:{port}/json/list
               |
               v
      Targets received?
         |           |
        YES          NO ---> Port unreachable -> try next port
         |
         v
   Search for "workbench" target:
   - Check t['url'] or t['title'] for "workbench"
         |
         +-- Found workbench? --> Extract webSocketDebuggerUrl
         |                        Mark state: CONNECTED
         |
         +-- No workbench? -----> Fallback to targets[0]
                                  Extract webSocketDebuggerUrl
                                  Mark state: CONNECTED
```

If neither port responds, the adapter sets `last_status = "disconnected"`.

---

## 3. How to Launch Antigravity with Remote Debugging

To enable the live visual viewport snapshot and remote scroll synchronization, launch Antigravity with the `--remote-debugging-port` command-line argument:

### Method A: From Windows PowerShell or Command Prompt
```powershell
# Using environment variable placeholder
& "$env:LOCALAPPDATA\Programs\Antigravity IDE\Antigravity IDE.exe" --remote-debugging-port=9000
```

### Method B: Desktop Shortcut Configuration
1. Right-click your desktop shortcut for **Antigravity IDE** and select **Properties**.
2. In the **Target** field, append `--remote-debugging-port=9000` to the end of the executable path:
   ```text
   "%LOCALAPPDATA%\Programs\Antigravity IDE\Antigravity IDE.exe" --remote-debugging-port=9000
   ```
3. Click **Apply** and **OK**.

---

## 4. DOM Snapshotting & Mobile Viewport Mirroring

When connected via CDP, AgentWatch executes targeted JavaScript evaluation inside the Antigravity conversation window:

1. **DOM Extraction:** Serializes the `#conversation` or `#cascade` container.
2. **CSS Extraction:** Collects applied stylesheets and fonts.
3. **Dark Mode Theme Overrides:** AgentWatch injects custom CSS rules to guarantee maximum readability on small mobile screens:
   - Sets background to deep slate (`#0f172a`).
   - Forces inline dark text (`rgb(0, 0, 0)`) to clean light typography (`#e2e8f0`).
   - Normalizes embedded code blocks with responsive horizontal scrollbars and mobile copy buttons.
   - Hides broken local file path icons (`img[src^="/c:"]`).

---

## 5. Security & Permission Boundary Architecture

### The Strict Native Permission Boundary
Antigravity coding agents periodically execute consequential operations (e.g. executing commands in the terminal or modifying system files). The IDE presents a native security dialog requiring user confirmation.

**AgentWatch explicitly preserves this security boundary:**
- Remote clicks dispatched through `/remote-click` inspect the target element's text.
- If the text contains permission-granting verbs (e.g., `"Allow"`, `"Authorize"`, `"Grant Permission"`), the request is **rejected** with:
  ```json
  {
    "success": false,
    "status": "requires_native_ide",
    "message": "Security policy requires approving permission dialogs in native desktop IDE."
  }
  ```
- **Rationale:** Simulating automated clicks on native security dialogs would create a critical vulnerability, allowing malicious remote inputs to bypass agent sandboxes. AgentWatch strictly enforces that native confirmations must occur locally on the physical workstation.
