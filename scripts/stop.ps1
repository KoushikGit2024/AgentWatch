# Stop AgentWatch process listening on port 8000 safely
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

Write-Host "Stopping AgentWatch instance on port 8000..." -ForegroundColor Cyan

$connections = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }

if (-not $connections) {
    Write-Host "No active AgentWatch process detected listening on port 8000." -ForegroundColor Green
    exit 0
}

foreach ($conn in $connections) {
    $procId = $conn.OwningProcess
    try {
        $proc = Get-Process -Id $procId -ErrorAction Stop
        if ($proc.ProcessName -like "*python*" -or $proc.ProcessName -like "*uvicorn*") {
            Write-Host "Stopping process PID $procId ($($proc.ProcessName))..." -ForegroundColor Yellow
            Stop-Process -Id $procId -Force
            Write-Host "AgentWatch process stopped." -ForegroundColor Green
        } else {
            Write-Host "Process PID $procId is '$($proc.ProcessName)' (not a python process). Skipping for safety." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Could not inspect or terminate PID $procId" -ForegroundColor Red
    }
}
