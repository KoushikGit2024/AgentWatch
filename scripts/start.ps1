<#
.SYNOPSIS
    Starts the AgentWatch backend service cleanly on 127.0.0.1:8000 using the project virtual environment.
#>

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
Set-Location -Path $projectRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "             Starting AgentWatch Service               " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

. "$scriptDir\find_tools.ps1"

# 1. Check Python Virtual Environment & System Python
$pythonExe = Join-Path $projectRoot ".venv\Scripts\python.exe"
$pyReady = $false

if (Test-Path $pythonExe) {
    $verifyPy = & $pythonExe -c "import sys; print(sys.executable)" 2>$null
    if ($LASTEXITCODE -eq 0 -and $verifyPy) {
        $pyReady = $true
    }
}

if (-not $pyReady) {
    Write-Host "📦 Virtual environment not found or broken. Running automated setup..." -ForegroundColor Yellow
    & "$scriptDir\setup.ps1"
}

# 2. Check and clean up Port 8000 automatically
$port8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
if ($port8000) {
    foreach ($conn in $port8000) {
        $pidToKill = $conn.OwningProcess
        try {
            $p = Get-Process -Id $pidToKill -ErrorAction SilentlyContinue
            if ($p -and ($p.ProcessName -like "*python*" -or $p.ProcessName -like "*uvicorn*")) {
                Write-Host "🔄 Stopping existing AgentWatch instance (PID $pidToKill)..." -ForegroundColor Yellow
                Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
                Start-Sleep -Milliseconds 800
            } else {
                Write-Host "⚠️  Port 8000 is occupied by '$($p.ProcessName)' (PID $pidToKill)." -ForegroundColor Yellow
            }
        } catch { }
    }
}

# 3. Check MongoDB service
$mongoSvc = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
if ($mongoSvc -and $mongoSvc.Status -ne "Running") {
    Write-Host "⚠️  MongoDB Windows Service is stopped. Starting..." -ForegroundColor Yellow
    Start-Service MongoDB -ErrorAction SilentlyContinue
}

# 4. Start AgentWatch
Write-Host "🚀 Launching AgentWatch on http://127.0.0.1:8000 ..." -ForegroundColor Green
$env:PYTHONPATH = $projectRoot

# Execute Uvicorn server
& $pythonExe -m uvicorn main:app --host 127.0.0.1 --port 8000
