# AgentWatch -- Remote Access and Tailscale Status Check
$ErrorActionPreference = "SilentlyContinue"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  AgentWatch -- Remote Access and Tailscale Status Check" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check Tailscale CLI
$tsPath = (Get-Command tailscale -ErrorAction SilentlyContinue).Source
if (-not $tsPath -and (Test-Path "C:\Program Files\Tailscale\tailscale.exe")) {
    $tsPath = "C:\Program Files\Tailscale\tailscale.exe"
}

if (-not $tsPath) {
    Write-Host "[FAIL] Tailscale executable not found in PATH or 'C:\Program Files\Tailscale'." -ForegroundColor Red
    Write-Host "   Install Tailscale from https://tailscale.com/" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "[OK] Tailscale CLI located." -ForegroundColor Green
}

# 2. Check Tailscale Status
$tsStatus = & $tsPath status 2>&1
if ($LASTEXITCODE -eq 0 -and $tsStatus) {
    Write-Host "[OK] Tailscale is connected to your private tailnet." -ForegroundColor Green
    $lines = ($tsStatus | Out-String).Trim() -split "`n"
    Write-Host "   Tailnet peer devices detected: $($lines.Count)" -ForegroundColor Gray
} else {
    Write-Host "[WARN] Tailscale is installed but NOT currently logged in or connected." -ForegroundColor Yellow
}

# 3. Check Tailscale Serve Status
$serveStatus = & $tsPath serve status 2>&1
$serveText = ($serveStatus | Out-String)
if ($serveText -match "proxy http://127.0.0.1:8000" -or $serveText -match "proxy http://localhost:8000" -or $serveText -match "8000") {
    Write-Host "[OK] Tailscale Serve is actively proxying to local port 8000 (tailnet HTTPS enabled)." -ForegroundColor Green
} else {
    Write-Host "[WARN] Tailscale Serve is not currently configured for port 8000." -ForegroundColor Yellow
    Write-Host "   To enable private tailnet access, run:" -ForegroundColor Gray
    Write-Host "   tailscale serve --bg 8000" -ForegroundColor White
}

# 4. Verify Tailscale Funnel is DISABLED
$funnelStatus = & $tsPath funnel status 2>&1
$funnelText = ($funnelStatus | Out-String).ToLower()
if ($funnelText -match "funnel is on" -or $funnelText -match "public") {
    Write-Host "[ALERT] CRITICAL SECURITY ALERT: Tailscale Funnel appears to be ENABLED!" -ForegroundColor Red
    Write-Host "   Immediately disable Funnel to protect your local environment:" -ForegroundColor Red
    Write-Host "   tailscale funnel reset" -ForegroundColor White
} else {
    Write-Host "[OK] Tailscale Funnel is DISABLED (No public internet exposure). Safe." -ForegroundColor Green
}

# 5. Check Local Backend Reachability
try {
    $resp = Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -TimeoutSec 2 -ErrorAction Stop
    if ($resp.status -eq "healthy") {
        Write-Host "[OK] Local AgentWatch backend is running and reachable on http://127.0.0.1:8000/health." -ForegroundColor Green
    }
} catch {
    Write-Host "[INFO] Local AgentWatch backend is not currently running on http://127.0.0.1:8000." -ForegroundColor Gray
    Write-Host "   Start it using: .\scripts\start.ps1" -ForegroundColor Gray
}

Write-Host "==========================================================" -ForegroundColor Cyan
