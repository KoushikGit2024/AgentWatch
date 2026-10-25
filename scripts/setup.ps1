<#
.SYNOPSIS
    AgentWatch Setup Script -- initializes Python venv and installs all dependencies reproducibly.
#>

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
Set-Location -Path $projectRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "                AgentWatch Setup                       " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

. "$scriptDir\find_tools.ps1"

# 1. Locate System Python
$pythonCmd = Find-PythonExecutable

if (-not $pythonCmd) {
    Write-Host "[ERROR] A functional Python 3.10+ runtime was not found. Please install Python 3.12 or later." -ForegroundColor Red
    exit 1
}

Write-Host "Using Python executable: $pythonCmd" -ForegroundColor Gray

# 2. Create Virtual Environment
$venvPath = Join-Path $projectRoot ".venv"
$venvPython = Join-Path $venvPath "Scripts\python.exe"

$recreate = $true
if (Test-Path $venvPython) {
    $verifyPy = & $venvPython -c "import sys; print(sys.executable)" 2>$null
    if ($LASTEXITCODE -eq 0 -and $verifyPy) {
        $recreate = $false
        Write-Host "[OK] Existing virtual environment verified at .venv." -ForegroundColor Green
    }
}

if ($recreate) {
    Write-Host "[INFO] Initializing virtual environment at .venv..." -ForegroundColor Yellow
    Remove-Item -Path $venvPath -Recurse -Force -ErrorAction SilentlyContinue
    & $pythonCmd -m venv $venvPath
    Write-Host "[OK] Virtual environment created." -ForegroundColor Green
}

# 3. Upgrade pip and Install Dependencies
$venvPython = Join-Path $venvPath "Scripts\python.exe"
Write-Host "[INFO] Installing project dependencies from requirements.txt..." -ForegroundColor Yellow
& $venvPython -m pip install -i https://pypi.org/simple -r (Join-Path $projectRoot "requirements.txt")

Write-Host "[OK] Dependencies installed successfully." -ForegroundColor Green

# 4. Copy .env.example to .env if missing
$envFile = Join-Path $projectRoot ".env"
$envExample = Join-Path $projectRoot ".env.example"
if (-not (Test-Path $envFile) -and (Test-Path $envExample)) {
    Copy-Item $envExample $envFile
    Write-Host "[OK] Created default local .env file from .env.example template." -ForegroundColor Green
}

Write-Host "`nSetup complete! You can now start AgentWatch using:" -ForegroundColor Cyan
Write-Host "  .\scripts\start.ps1" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
