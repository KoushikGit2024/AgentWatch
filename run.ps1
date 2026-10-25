# AgentWatch One-Click Launch Script

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -Path $scriptDir

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "         AgentWatch Automatic Build and Launch" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Locate Python
$venvPython = Join-Path $scriptDir ".venv\Scripts\python.exe"
$pyOk = $false

if (Test-Path $venvPython) {
    try {
        $check = & $venvPython -c "import uvicorn, fastapi, websockets; print('OK')" 2>$null
        if ($LASTEXITCODE -eq 0 -and "$check".Trim() -eq "OK") {
            $pyOk = $true
        }
    } catch {
        $pyOk = $false
    }
}

if (-not $pyOk) {
    Write-Host "Locating Python..." -ForegroundColor Yellow
    $foundPy = (Get-Command python -ErrorAction SilentlyContinue).Source

    if (-not $foundPy) {
        $candidates = @(
            "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe",
            "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
            "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe",
            "C:\Program Files\Python313\python.exe",
            "C:\Program Files\Python312\python.exe",
            "C:\Program Files\Python311\python.exe"
        )

        foreach ($candidate in $candidates) {
            if (Test-Path $candidate) {
                $foundPy = $candidate
                break
            }
        }
    }

    if (-not $foundPy) {
        Write-Host "Python was not found. Install Python 3.10 or newer." -ForegroundColor Red
        exit 1
    }

    Write-Host "Creating virtual environment..." -ForegroundColor Yellow

    $venvDir = Join-Path $scriptDir ".venv"
    if (Test-Path $venvDir) {
        Remove-Item -Path $venvDir -Recurse -Force
    }

    & $foundPy -m venv $venvDir
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to create the Python virtual environment."
    }

    $venvPython = Join-Path $venvDir "Scripts\python.exe"

    Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
    & $venvPython -m pip install --upgrade pip
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to upgrade pip."
    }

    $requirements = Join-Path $scriptDir "requirements.txt"
    if (-not (Test-Path $requirements)) {
        throw "requirements.txt was not found."
    }

    & $venvPython -m pip install -r $requirements
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install Python dependencies."
    }
}

if (-not (Test-Path $venvPython)) {
    throw "The virtual environment Python executable is missing."
}

Write-Host "Python runtime: $venvPython" -ForegroundColor Green

# 2. Build Frontend
$frontendDir = Join-Path $scriptDir "frontend"
$distIndex = Join-Path $scriptDir "static\dist\index.html"
$nodeModules = Join-Path $frontendDir "node_modules"

if (Test-Path $frontendDir) {
    $foundNpm = (Get-Command npm -ErrorAction SilentlyContinue).Source

    if (-not $foundNpm) {
        $npmCandidates = @(
            "$env:APPDATA\npm\npm.cmd",
            "C:\Program Files\nodejs\npm.cmd",
            "$env:LOCALAPPDATA\Programs\nodejs\npm.cmd"
        )

        foreach ($candidate in $npmCandidates) {
            if (Test-Path $candidate) {
                $foundNpm = $candidate
                break
            }
        }
    }

    if ($foundNpm) {
        Push-Location $frontendDir
        try {
            if (-not (Test-Path $nodeModules)) {
                Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
                & $foundNpm install
                if ($LASTEXITCODE -ne 0) {
                    throw "Frontend dependency installation failed."
                }
            }

            Write-Host "Building frontend..." -ForegroundColor Cyan
            & $foundNpm run build
            if ($LASTEXITCODE -ne 0) {
                throw "Frontend build failed."
            }
        } finally {
            Pop-Location
        }

        Write-Host "Frontend build completed." -ForegroundColor Green
    } elseif (Test-Path $distIndex) {
        Write-Host "Using existing frontend build." -ForegroundColor Gray
    } else {
        throw "npm is unavailable and the frontend build is missing."
    }
}

# 3. Check and clean Port 8000
Write-Host "Checking port 8000..." -ForegroundColor Cyan

$port8000 = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue

if ($port8000) {
    foreach ($connection in $port8000) {
        $processIdToStop = $connection.OwningProcess
        $process = Get-Process -Id $processIdToStop -ErrorAction SilentlyContinue

        if ($process -and $process.ProcessName -match "python|uvicorn") {
            Write-Host "Stopping existing server process $processIdToStop..." -ForegroundColor Yellow
            Stop-Process -Id $processIdToStop -Force
            Start-Sleep -Milliseconds 600
        } else {
            throw "Port 8000 is occupied by another process. PID: $processIdToStop"
        }
    }
}

# 4. Check Antigravity CDP & Auto-Launch if missing
$cdpActive = $false

foreach ($port in 9000..9003) {
    $connection = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue

    if ($connection) {
        Write-Host "Antigravity CDP active on port $port." -ForegroundColor Green
        $cdpActive = $true
        break
    }
}

if (-not $cdpActive) {
    Write-Host "[INFO] Antigravity IDE CDP not detected on port 9000. Launching Antigravity IDE..." -ForegroundColor Yellow

    # Target strictly Antigravity IDE (the desktop editor)
    $ideCandidates = @(
        "$env:LOCALAPPDATA\Programs\Antigravity IDE\Antigravity IDE.exe",
        "C:\Program Files\Antigravity IDE\Antigravity IDE.exe"
    )
    $agPath = $null
    foreach ($cand in $ideCandidates) {
        if (Test-Path $cand -ErrorAction SilentlyContinue) {
            $agPath = $cand
            break
        }
    }

    if ($agPath) {
        Write-Host "[START] Starting Antigravity IDE with --remote-debugging-port=9000..." -ForegroundColor Cyan
        Start-Process -FilePath $agPath -ArgumentList "--remote-debugging-port=9000"
        
        # Wait up to 10 seconds for CDP port 9000 to bind
        Write-Host "Waiting for Antigravity IDE CDP port 9000 to bind..." -ForegroundColor Gray
        for ($i = 0; $i -lt 10; $i++) {
            Start-Sleep -Seconds 1
            $c = Get-NetTCPConnection -LocalPort 9000 -State Listen -ErrorAction SilentlyContinue
            if ($c) {
                Write-Host "[OK] Antigravity IDE CDP bound to port 9000." -ForegroundColor Green
                $cdpActive = $true
                break
            }
        }
    } else {
        Write-Host "   Could not locate 'Antigravity IDE.exe' in standard install paths." -ForegroundColor Yellow
        Write-Host "   Please ensure Antigravity IDE is running with '--remote-debugging-port=9000'." -ForegroundColor Gray
    }
}

# 5. Check MongoDB
$mongoService = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue

if ($mongoService) {
    if ($mongoService.Status -ne "Running") {
        try {
            Start-Service -Name "MongoDB" -ErrorAction Stop
            $mongoService.WaitForStatus("Running", [TimeSpan]::FromSeconds(10))
        } catch {
            Write-Host "MongoDB service could not be started: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }

    if ((Get-Service -Name "MongoDB").Status -eq "Running") {
        Write-Host "MongoDB service is running." -ForegroundColor Green
    } else {
        Write-Host "MongoDB service is not running." -ForegroundColor Yellow
    }
} else {
    $mongoPort = Get-NetTCPConnection -LocalPort 27017 -State Listen -ErrorAction SilentlyContinue

    if ($mongoPort) {
        Write-Host "MongoDB is listening on port 27017." -ForegroundColor Green
    } else {
        Write-Host "MongoDB was not detected. Application fallback depends on its configuration." -ForegroundColor Yellow
    }
}

# 6. Launch AgentWatch
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Launching AgentWatch at http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

$env:PYTHONPATH = $scriptDir

Start-Process "http://127.0.0.1:8000"

& $venvPython -m uvicorn main:app --host 127.0.0.1 --port 8000

if ($LASTEXITCODE -ne 0) {
    throw "The AgentWatch server exited with code $LASTEXITCODE."
}