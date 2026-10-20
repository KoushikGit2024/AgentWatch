<#
.SYNOPSIS
    Starts the CloudWatchV2 backend service cleanly on 127.0.0.1:8000 using the project virtual environment.
#>

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
Set-Location -Path $projectRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "             Starting CloudWatchV2 Service               " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check Python Virtual Environment
$pythonExe = Join-Path $projectRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $pythonExe)) {
    Write-Host "❌ Virtual environment not found at .venv. Run .\scripts\setup.ps1 first." -ForegroundColor Red
    exit 1
}

# 2. Check if Port 8000 is already in use
$netstat = netstat -ano | Select-String ":8000" | Select-String "LISTENING"
if ($netstat) {
    Write-Host "⚠️  Port 8000 is already in use by an active process." -ForegroundColor Yellow
    Write-Host "   Run .\scripts\stop.ps1 first if this is an old instance." -ForegroundColor Yellow
}

# 3. Check MongoDB service
$mongoSvc = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
if ($mongoSvc -and $mongoSvc.Status -ne "Running") {
    Write-Host "⚠️  MongoDB Windows Service is installed but NOT currently Running." -ForegroundColor Yellow
    Write-Host "   Start it via: Start-Service MongoDB" -ForegroundColor Gray
}

# 4. Start CloudWatchV2
Write-Host "🚀 Launching CloudWatchV2 on http://127.0.0.1:8000 ..." -ForegroundColor Green
$env:PYTHONPATH = $projectRoot

# Execute Uvicorn server
& $pythonExe -m uvicorn main:app --host 127.0.0.1 --port 8000
