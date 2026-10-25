<#
.SYNOPSIS
    AgentWatch One-Click Launch Script
    Builds the frontend, checks/frees ports, verifies environment, and launches AgentWatch.
#>

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -Path $scriptDir

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "         AgentWatch Automatic Build & Launch              " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

. "$scriptDir\scripts\find_tools.ps1"

# 1. Check Python Virtual Environment & System Python
Write-Host "🔍 Locating Python runtime..." -ForegroundColor Cyan
$venvPython = Join-Path $scriptDir ".venv\Scripts\python.exe"
$pythonUsable = $false

if (Test-Path $venvPython) {
    $verifyPy = & $venvPython -c "import sys; print(sys.executable)" 2>$null
    if ($LASTEXITCODE -eq 0 -and $verifyPy) {
        $pythonUsable = $true
    }
}

if (-not $pythonUsable) {
    Write-Host "📦 Virtual environment missing or broken. Locating system Python..." -ForegroundColor Yellow
    $sysPython = Find-PythonExecutable
    if (-not $sysPython) {
        Write-Host "❌ Could not find a working Python 3.10+ installation." -ForegroundColor Red
        Write-Host "   Please install Python from https://python.org and add it to your PATH." -ForegroundColor Yellow
        exit 1
    }
    Write-Host "Using system Python: $sysPython" -ForegroundColor Gray
    Write-Host "📦 Initializing clean .venv at $scriptDir\.venv..." -ForegroundColor Yellow
    Remove-Item -Path (Join-Path $scriptDir ".venv") -Recurse -Force -ErrorAction SilentlyContinue
    & $sysPython -m venv (Join-Path $scriptDir ".venv")
    $venvPython = Join-Path $scriptDir ".venv\Scripts\python.exe"
    & $venvPython -m pip install --upgrade pip -q 2>$null
    & $venvPython -m pip install -r (Join-Path $scriptDir "requirements.txt") -q
}

Write-Host "✅ Python runtime verified: $venvPython" -ForegroundColor Green

# 2. Build Frontend (Dynamic Node/NPM detection)
Write-Host "`n🔨 Checking Frontend Build..." -ForegroundColor Cyan
$frontendDir = Join-Path $scriptDir "frontend"
$distIndex = Join-Path $scriptDir "static\dist\index.html"

if (Test-Path $frontendDir) {
    $nodeExe = Find-NodeExecutable
    $npmExe = Find-NpmExecutable

    if ($nodeExe -and $npmExe) {
        $nodeDir = Split-Path -Parent $nodeExe
        $env:PATH = "$nodeDir;$env:PATH"
        try {
            Push-Location $frontendDir
            Write-Host "📦 Building React bundle using $npmExe..." -ForegroundColor Gray
            & $npmExe run build
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Frontend successfully built and deployed to static/dist" -ForegroundColor Green
            } else {
                Write-Host "⚠️  Frontend build command returned non-zero ($LASTEXITCODE). Using existing static/dist..." -ForegroundColor Yellow
            }
        } catch {
            Write-Host "⚠️  Build step encountered an error: $_. Continuing with existing assets..." -ForegroundColor Yellow
        } finally {
            Pop-Location
        }
    } elseif (Test-Path $distIndex) {
        Write-Host "ℹ️  Node/npm not detected in PATH, but existing production bundle is present at static/dist." -ForegroundColor Gray
    } else {
        Write-Host "⚠️  Node/npm not detected in standard paths and static/dist is missing. Frontend may be unavailable until 'npm run build' is executed." -ForegroundColor Yellow
    }
}

# 3. Check and clean up Port 8000 if occupied
Write-Host "`n🔍 Checking Port 8000..." -ForegroundColor Cyan
$port8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
if ($port8000) {
    foreach ($conn in $port8000) {
        $pidToKill = $conn.OwningProcess
        try {
            $p = Get-Process -Id $pidToKill -ErrorAction SilentlyContinue
            if ($p -and ($p.ProcessName -like "*python*" -or $p.ProcessName -like "*uvicorn*")) {
                Write-Host "🔄 Stopping existing AgentWatch server (PID $pidToKill)..." -ForegroundColor Yellow
                Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
                Start-Sleep -Milliseconds 800
            } else {
                Write-Host "⚠️  Port 8000 is occupied by '$($p.ProcessName)' (PID $pidToKill)." -ForegroundColor Yellow
            }
        } catch { }
    }
} else {
    Write-Host "✅ Port 8000 is free." -ForegroundColor Green
}

# 4. Check Antigravity CDP Port 9000 status
Write-Host "`n🔌 Checking Antigravity CDP Ports (9000-9003)..." -ForegroundColor Cyan
$cdpFound = $false
foreach ($cdpPort in 9000..9003) {
    $cdpConn = Get-NetTCPConnection -LocalPort $cdpPort -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
    if ($cdpConn) {
        Write-Host "✅ Antigravity CDP active on port $cdpPort" -ForegroundColor Green
        $cdpFound = $true
        break
    }
}
if (-not $cdpFound) {
    Write-Host "ℹ️  Antigravity IDE not currently listening on remote-debugging port 9000." -ForegroundColor Gray
    Write-Host "   (Make sure Antigravity is running with --remote-debugging-port=9000 if you want live IDE interaction)" -ForegroundColor Gray
}

# 5. Check MongoDB status
Write-Host "`n🍃 Checking MongoDB..." -ForegroundColor Cyan
$mongoSvc = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
if ($mongoSvc) {
    if ($mongoSvc.Status -ne "Running") {
        Write-Host "⚠️  MongoDB service is stopped. Attempting to start..." -ForegroundColor Yellow
        Start-Service MongoDB -ErrorAction SilentlyContinue
    }
    Write-Host "✅ MongoDB service: Running" -ForegroundColor Green
} else {
    $mongoPort = Get-NetTCPConnection -LocalPort 27017 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
    if ($mongoPort) {
        Write-Host "✅ MongoDB listening on port 27017" -ForegroundColor Green
    } else {
        Write-Host "⚠️  MongoDB port 27017 not detected. AgentWatch will run with local fallback/retries." -ForegroundColor Yellow
    }
}

# 6. Launch Server & Open Browser
Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "🚀 Launching AgentWatch on http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

Start-Process "http://127.0.0.1:8000"

$env:PYTHONPATH = $scriptDir
& $venvPython -m uvicorn main:app --host 127.0.0.1 --port 8000
