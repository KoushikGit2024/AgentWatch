@echo off
setlocal enabledelayedexpansion

title AgentWatch Launcher

echo ==========================================================
echo          AgentWatch Automatic Build ^& Launch
echo ==========================================================

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1"

if %ERRORLEVEL% neq 0 (
    echo.
    echo Script ended with exit code %ERRORLEVEL%.
    pause
)
