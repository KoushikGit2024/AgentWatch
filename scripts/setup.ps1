<#
.SYNOPSIS
    AgentWatch Setup Script — initializes Python venv and installs all dependencies reproducibly.
#>

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
Set-Location -Path $projectRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "                AgentWatch Setup                       " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Locate System Python
$pythonCmd = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $pythonCmd -and (Test-Path "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe")) {
    $pythonCmd = "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe"
}

if (-not $pythonCmd) {
    Write-Host "❌ Python 3.12+ was not found. Please install Python 3.12 or later." -ForegroundColor Red
    exit 1
}

Write-Host "Using Python executable: $pythonCmd" -ForegroundColor Gray

# 2. Create Virtual Environment
$venvPath = Join-Path $projectRoot ".venv"
if (-not (Test-Path $venvPath)) {
    Write-Host "📦 Creating virtual environment at .venv..." -ForegroundColor Yellow
    & $pythonCmd -m venv $venvPath
    Write-Host "✅ Virtual environment created." -ForegroundColor Green
} else {
    Write-Host "✅ Virtual environment already exists at .venv." -ForegroundColor Green
}

# 3. Upgrade pip and Install Dependencies
$venvPython = Join-Path $venvPath "Scripts\python.exe"
Write-Host "📦 Installing project dependencies from requirements.txt..." -ForegroundColor Yellow
& $venvPython -m pip install -i https://pypi.org/simple -r (Join-Path $projectRoot "requirements.txt")

Write-Host "✅ Dependencies installed successfully." -ForegroundColor Green

# 4. Copy .env.example to .env if missing
$envFile = Join-Path $projectRoot ".env"
$envExample = Join-Path $projectRoot ".env.example"
if (-not (Test-Path $envFile) -and (Test-Path $envExample)) {
    Copy-Item $envExample $envFile
    Write-Host "✅ Created default local .env file from .env.example template." -ForegroundColor Green
}

Write-Host "`nSetup complete! You can now start AgentWatch using:" -ForegroundColor Cyan
Write-Host "  .\scripts\start.ps1" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
