@echo off
setlocal
if "%~1"=="" (
    powershell -ExecutionPolicy Bypass -File "%~dp0tools\run_pio.ps1" -Action upload-monitor
) else (
    powershell -ExecutionPolicy Bypass -File "%~dp0tools\run_pio.ps1" -Action upload-monitor -Port %1
)
echo.
pause
