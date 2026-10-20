# AgentWatch System Doctor
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "                AgentWatch Doctor                      " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Python Environment
$pythonExe = Join-Path $projectRoot ".venv\Scripts\python.exe"
if (Test-Path $pythonExe) {
    $pyVer = & $pythonExe --version
    Write-Host "[OK] Virtual Environment: Found ($pyVer)" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Virtual Environment: Missing (.venv). Run .\scripts\setup.ps1" -ForegroundColor Red
}

# 2. MongoDB Community Server Check
$mongoSvc = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
if ($mongoSvc) {
    if ($mongoSvc.Status -eq "Running") {
        Write-Host "[OK] MongoDB Windows Service: Running" -ForegroundColor Green
    } else {
        Write-Host "[WARN] MongoDB Windows Service: Installed but $($mongoSvc.Status)" -ForegroundColor Yellow
    }
} else {
    Write-Host "[WARN] MongoDB Windows Service: Service 'MongoDB' not found" -ForegroundColor Yellow
}

# Test MongoDB Ping
$mongosh = (Get-Command mongosh -ErrorAction SilentlyContinue).Source
if (-not $mongosh -and (Test-Path "$env:LOCALAPPDATA\Programs\mongosh\mongosh.exe")) {
    $mongosh = "$env:LOCALAPPDATA\Programs\mongosh\mongosh.exe"
}

if ($mongosh) {
    $ping = & $mongosh --quiet --eval "db.runCommand({ ping: 1 }).ok" 2>$null
    if ($ping -match "1") {
        Write-Host "[OK] MongoDB Connection: Reachable on 127.0.0.1:27017 (ping OK)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] MongoDB Connection: Failed to ping localhost:27017" -ForegroundColor Red
    }
}

# 3. Tailscale Status Check
$tsCmd = (Get-Command tailscale -ErrorAction SilentlyContinue).Source
if (-not $tsCmd -and (Test-Path "C:\Program Files\Tailscale\tailscale.exe")) {
    $tsCmd = "C:\Program Files\Tailscale\tailscale.exe"
}

if ($tsCmd) {
    $tsVer = & $tsCmd version | Select-Object -First 1
    Write-Host "[OK] Tailscale CLI: Installed ($tsVer)" -ForegroundColor Green
    
    $serveStatus = & $tsCmd serve status 2>&1 | Out-String
    if ($serveStatus -match "8000" -or $serveStatus -match "tailnet only") {
        Write-Host "[OK] Tailscale Serve: Active on tailnet (proxying to port 8000)" -ForegroundColor Green
    } else {
        Write-Host "[INFO] Tailscale Serve: Inactive (run 'tailscale serve --bg 8000' to enable)" -ForegroundColor Gray
    }

    $funnelStatus = & $tsCmd funnel status 2>&1 | Out-String
    if ($funnelStatus.ToLower() -match "funnel is on" -or $funnelStatus.ToLower() -match "public") {
        Write-Host "[ALERT] Tailscale Funnel: ENABLED! (Security risk - should be disabled)" -ForegroundColor Red
    } else {
        Write-Host "[OK] Tailscale Funnel: Disabled (Private tailnet only - safe)" -ForegroundColor Green
    }
} else {
    Write-Host "[WARN] Tailscale CLI: Not detected" -ForegroundColor Yellow
}

# 4. Antigravity CDP Port Check
$cdpFound = $false
foreach ($p in 9000..9003) {
    try {
        $res = Invoke-RestMethod -Uri "http://127.0.0.1:$p/json/version" -TimeoutSec 1 -ErrorAction SilentlyContinue
        if ($res) {
            Write-Host "[OK] Antigravity CDP: Responding on port $p" -ForegroundColor Green
            $cdpFound = $true
            break
        }
    } catch {}
}

if (-not $cdpFound) {
    Write-Host "[INFO] Antigravity CDP: Not detected on ports 9000-9003 (Launch Antigravity with '--remote-debugging-port=9000')" -ForegroundColor Gray
}

Write-Host "==========================================================" -ForegroundColor Cyan
