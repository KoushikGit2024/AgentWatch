# 12 — Device-Wise Troubleshooting & Edge-Case Runbook

**Document ID:** CW-DOC-012  
**Version:** 2.1.0  
**Project:** AgentWatch  
**Classification:** Operational Diagnostics & Edge-Case Runbook  

---

## 1. Edge Case: Antigravity Launched with `--remote-debugging-port=9000`, But Port 9000 Is Still Closed

- **Root Cause:** Electron applications (like Antigravity) use a single-instance lock. If an existing Antigravity window or background tray process was already running *without* `--remote-debugging-port=9000`, running `antigravity --remote-debugging-port=9000` simply focuses the existing process and **ignores the new command-line flag**.
- **Exact Fix (Device-Wise):**
  - **Windows (PowerShell):**
    ```powershell
    Stop-Process -Name "Antigravity*" -Force -ErrorAction SilentlyContinue
    Start-Process "antigravity" -ArgumentList "--remote-debugging-port=9000"
    Invoke-RestMethod -Uri "http://127.0.0.1:9000/json/list"
    ```
  - **macOS (zsh / bash):**
    ```bash
    killall "Antigravity" 2>/dev/null || true
    open -a "Antigravity" --args --remote-debugging-port=9000
    curl -s http://127.0.0.1:9000/json/list | head -n 20
    ```
  - **Linux (bash):**
    ```bash
    pkill -f antigravity || true
    nohup antigravity --remote-debugging-port=9000 >/dev/null 2>&1 &
    curl -s http://127.0.0.1:9000/json/list | head -n 20
    ```

---

## 2. Edge Case: Multiple Antigravity Windows Open Simultaneously

- **Symptom:** You have two project windows open in Antigravity, or the Settings window is focused.
- **How AgentWatch Handles It:** `AntigravityAdapter._target_priority()` scores targets so active `workbench.html` workspace windows (`score: 100`) are prioritized over Settings tabs (`score: 40`) or DevTools inspectors (`rejected`). You can also launch secondary windows on ports `9001`, `9002`, or `9003` (`CDP_PORTS=9000,9001,9002,9003`).

---

## 3. Edge Case: WSL2 Cannot Reach Windows Host Antigravity CDP (Port 9000)

- **Root Cause:** When AgentWatch runs inside WSL2 Linux and Antigravity runs on the Windows desktop, WSL2 NAT mode isolates `127.0.0.1`.
- **Exact Fix:** Enable **Mirrored Networking** in `C:\Users\<YourUser>\.wslconfig`:
  ```ini
  [wsl2]
  networkingMode=mirrored
  localhostForwarding=true
  ```
  Then restart WSL from PowerShell:
  ```powershell
  wsl --shutdown
  ```

---

## 4. Edge Case: Phone Cannot Connect Over Local Wi-Fi or Tailscale

- **Windows Firewall Blocking Port 8000 (Local Wi-Fi Mode):**
  ```powershell
  New-NetFirewallRule -DisplayName "AgentWatch Port 8000" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow -Profile Private
  ```
- **Tailscale Serve HTTPS Reset / Stuck Proxy:**
  ```powershell
  tailscale serve --reset
  tailscale serve --bg 8000
  tailscale serve status
  ```

---

## 5. Edge Case: MongoDB Service Stopped or Not Installed

- **How AgentWatch Handles It:** `InteractionRepository` includes an automatic in-memory fallback store (`_fallback_store`) so command approvals and dynamic questions continue working even if MongoDB is temporarily offline.
- **To Start MongoDB:**
  - **Windows (Admin PowerShell):** `Start-Service MongoDB`
  - **macOS (Homebrew):** `brew services start mongodb-community`
  - **Linux (systemd):** `sudo systemctl enable --now mongod`
