# 12 — Troubleshooting Guide

### 1. MongoDB Connection Refused / Timed Out
- **Symptom**: `GET /ready` returns 503 with `"status": "disconnected"`.
- **Diagnosis**: Check if MongoDB Windows service is running:
  ```powershell
  Get-Service MongoDB
  ```
- **Remediation**:
  ```powershell
  Start-Service MongoDB
  ```

### 2. Port 8000 Conflict
- **Symptom**: `scripts\start.ps1` warns that port 8000 is occupied.
- **Remediation**:
  ```powershell
  .\scripts\stop.ps1
  ```

### 3. Antigravity CDP Not Detected
- **Symptom**: `doctor.ps1` reports CDP not responding on ports 9000-9003.
- **Remediation**: Launch Antigravity with debugging enabled:
  ```powershell
  antigravity . --remote-debugging-port=9000
  ```

### 4. Tailscale Remote Connection Fails on Phone
- **Symptom**: Android browser cannot reach the private URL.
- **Diagnosis**: Run `.\scripts\remote-status.ps1`. Ensure phone and laptop are signed into the same tailnet account and Tailscale Serve is active.
