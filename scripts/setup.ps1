
<#
.SYNOPSIS
    AgentWatch Setup Script — initializes Python venv and installs dependencies.
#>

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
Set-Location -Path $projectRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "                AgentWatch Setup                         " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Locate System Python
$pythonCmd = (Get-Command python -ErrorAction SilentlyContinue).Source

if (-not $pythonCmd) {
    $fallbackPython = Join-Path $env:LOCALAPPDATA "Programs\Python\Python312\python.exe"
    if (Test-Path $fallbackPython) {
        $pythonCmd = $fallbackPython
    }
}

if (-not $pythonCmd) {
    throw "Python 3.12 or later was not found. Please install Python and add it to PATH."
}

$pythonVersion = & $pythonCmd --version
Write-Host "Using Python: $pythonCmd ($pythonVersion)" -ForegroundColor Gray

# 2. Create Virtual Environment
$venvPath = Join-Path $projectRoot ".venv"
$venvPython = Join-Path $venvPath "Scripts\python.exe"

if (-not (Test-Path $venvPython)) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    & $pythonCmd -m venv $venvPath

    if ($LASTEXITCODE -ne 0) {
        throw "Failed to create the virtual environment."
    }
}

if (-not (Test-Path $venvPython)) {
    throw "Virtual environment Python executable was not created: $venvPython"
}

Write-Host "Virtual environment ready." -ForegroundColor Green

# 3. Install Dependencies
$requirementsFile = Join-Path $projectRoot "requirements.txt"

if (-not (Test-Path $requirementsFile)) {
    throw "requirements.txt was not found at $requirementsFile"
}

Write-Host "Installing project dependencies..." -ForegroundColor Yellow
& $venvPython -m pip install -i https://pypi.org/simple -r $requirementsFile

if ($LASTEXITCODE -ne 0) {
    throw "Dependency installation failed. Check the pip output above."
}

Write-Host "Dependencies installed successfully." -ForegroundColor Green

# 4. Create .env if missing
$envFile = Join-Path $projectRoot ".env"
$envExample = Join-Path $projectRoot ".env.example"

if ((-not (Test-Path $envFile)) -and (Test-Path $envExample)) {
    Copy-Item $envExample $envFile
    Write-Host "Created .env from .env.example." -ForegroundColor Green
}

Write-Host "`nSetup complete! Start AgentWatch using:" -ForegroundColor Cyan
Write-Host "  .\scripts\start.ps1" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
