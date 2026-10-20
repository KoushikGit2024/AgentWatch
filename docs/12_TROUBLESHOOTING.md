# 12 — Troubleshooting & Diagnostics Runbook

**Document ID:** CW-DOC-012  
**Version:** 2.0.0  
**Project:** CloudWatchV2 (AgentWatch)  
**Classification:** Operational Diagnostics Runbook  

---

## 1. Diagnostic Decision Tree

```
Issue Observed:
|
+---> [A] "Antigravity not connected via CDP (port 9000)" in Viewport
|     |
|     +---> Cause: Antigravity IDE was launched without remote debugging enabled.
|     +---> Resolution: Launch Antigravity with '--remote-debugging-port=9000'
|
+---> [B] Mobile browser shows "Cannot Reach Server" / Timeout
|     |
|     +---> Cause: Tailscale not running or Serve not configured.
|     +---> Resolution: Run 'tailscale status' and 'tailscale serve --bg 8000'
|
+---> [C] MongoDB Connection Error on Startup
|     |
|     +---> Cause: MongoDB Windows service is stopped.
|     +---> Resolution: Run 'Start-Service -Name MongoDB' in Administrator PowerShell.
|
+---> [D] 409 Conflict on Interaction Submit
|     |
|     +---> Cause: Stale request / interaction already submitted in another session.
|     +---> Resolution: Refresh the page; pending queue will synchronize.
```

---

## 2. Common Scenarios & Exact Resolutions

### Scenario 1: Antigravity CDP Port Disconnected
- **Symptom:** The viewport shows an empty state: `"Antigravity CDP is not currently connected."`
- **Explanation:** Antigravity runs as an Electron application. By default, Electron disables Chrome remote debugging ports unless explicitly passed on startup.
- **Fix:**
  1. Close any running Antigravity IDE instances.
  2. Start Antigravity with the port argument:
     ```powershell
     & "C:\Users\koush\AppData\Local\Programs\Antigravity IDE\Antigravity IDE.exe" --remote-debugging-port=9000
     ```
  3. Verify port 9000 is listening:
     ```powershell
     Get-NetTCPConnection -LocalPort 9000 -State Listen
     ```

### Scenario 2: Tailscale Authentication or TLS Certificate Warnings
- **Symptom:** Browser warns of insecure connection or refuses to open URL.
- **Explanation:** You may be trying to access the raw local IP without Tailscale Serve TLS.
- **Fix:**
  1. Verify Tailscale Serve: `tailscale serve status`.
  2. Use the official machine HTTPS domain: `https://<device-name>.<tailnet>.ts.net/`.
  3. Ensure Tailscale VPN is toggled "ON" in your Android settings.

### Scenario 3: MongoDB Service Unavailable
- **Symptom:** Startup crashes with `ServerSelectionTimeoutError: 127.0.0.1:27017: [WinError 10061] No connection could be made`.
- **Fix:**
  ```powershell
  Start-Service -Name MongoDB
  Get-Service -Name MongoDB
  ```
