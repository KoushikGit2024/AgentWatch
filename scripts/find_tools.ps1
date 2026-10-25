# Common Dynamic Locator Helper for AgentWatch Scripts
# Resolves Python, Node, NPM, and Antigravity IDE executables dynamically

function Find-PythonExecutable {
    # 1. Existing project .venv python
    $venvPy = Join-Path $PSScriptRoot "..\.venv\Scripts\python.exe"
    if (Test-Path $venvPy) {
        $testRun = & $venvPy -c "import sys; print(sys.executable)" 2>$null
        if ($LASTEXITCODE -eq 0 -and $testRun) {
            return (Resolve-Path $venvPy).Path
        }
    }

    # 2. Check py launcher
    $pyLauncher = (Get-Command py -ErrorAction SilentlyContinue).Source
    if ($pyLauncher) {
        $found = & $pyLauncher -c "import sys; print(sys.executable)" 2>$null
        if ($LASTEXITCODE -eq 0 -and (Test-Path $found)) { return $found.Trim() }
    }

    # 3. Check python in PATH
    $cmdPython = (Get-Command python -ErrorAction SilentlyContinue).Source
    if ($cmdPython) {
        $found = & $cmdPython -c "import sys; print(sys.executable)" 2>$null
        if ($LASTEXITCODE -eq 0 -and (Test-Path $found)) { return $found.Trim() }
    }

    # 4. Search common installation directories
    $candidates = @(
        "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python310\python.exe",
        "C:\Program Files\Python313\python.exe",
        "C:\Program Files\Python312\python.exe",
        "C:\Program Files\Python311\python.exe",
        "C:\Python312\python.exe",
        "C:\Python311\python.exe",
        "$env:ALLUSERSPROFILE\chocolatey\bin\python.exe",
        "$env:LOCALAPPDATA\Microsoft\WindowsApps\python3.exe",
        "$env:LOCALAPPDATA\Microsoft\WindowsApps\python.exe"
    )

    foreach ($cand in $candidates) {
        if (Test-Path $cand) {
            $testRun = & $cand -c "import sys; print(sys.executable)" 2>$null
            if ($LASTEXITCODE -eq 0 -and $testRun) {
                return (Resolve-Path $cand).Path
            }
        }
    }

    return $null
}

function Find-NodeExecutable {
    # 1. In PATH
    $cmdNode = (Get-Command node -ErrorAction SilentlyContinue).Source
    if ($cmdNode -and (Test-Path $cmdNode)) { return $cmdNode }

    # 2. Common paths
    $candidates = @(
        "C:\Program Files\nodejs\node.exe",
        "C:\Program Files (x86)\nodejs\node.exe",
        "$env:LOCALAPPDATA\Programs\nodejs\node.exe",
        "$env:APPDATA\npm\node.exe",
        "$env:NVM_HOME\node.exe"
    )

    # 3. NVM versions if installed
    $nvmDir = "$env:APPDATA\nvm"
    if (Test-Path $nvmDir) {
        $nvmNodes = Get-ChildItem -Path $nvmDir -Filter "node.exe" -Recurse -Depth 2 -ErrorAction SilentlyContinue
        if ($nvmNodes) { $candidates += $nvmNodes[0].FullName }
    }

    foreach ($cand in $candidates) {
        if ($cand -and (Test-Path $cand)) { return $cand }
    }
    return $null
}

function Find-NpmExecutable {
    # 1. In PATH
    $cmdNpm = (Get-Command npm -ErrorAction SilentlyContinue).Source
    if ($cmdNpm -and (Test-Path $cmdNpm)) { return $cmdNpm }

    # 2. Common paths
    $candidates = @(
        "$env:APPDATA\npm\npm.cmd",
        "C:\Program Files\nodejs\npm.cmd",
        "$env:LOCALAPPDATA\Programs\nodejs\npm.cmd"
    )

    $nodeExe = Find-NodeExecutable
    if ($nodeExe) {
        $nodeDir = Split-Path -Parent $nodeExe
        $candidates += (Join-Path $nodeDir "npm.cmd")
    }

    foreach ($cand in $candidates) {
        if ($cand -and (Test-Path $cand)) { return $cand }
    }
    return $null
}

function Find-AntigravityExecutable {
    $candidates = @(
        "$env:LOCALAPPDATA\Programs\Antigravity IDE\Antigravity IDE.exe",
        "$env:LOCALAPPDATA\Programs\Antigravity\Antigravity.exe",
        "C:\Program Files\Antigravity IDE\Antigravity IDE.exe",
        "C:\Program Files\Antigravity\Antigravity.exe"
    )

    $cmdAg = (Get-Command "antigravity" -ErrorAction SilentlyContinue).Source
    if ($cmdAg) { return $cmdAg }

    foreach ($cand in $candidates) {
        if (Test-Path $cand) { return $cand }
    }
    return $null
}
