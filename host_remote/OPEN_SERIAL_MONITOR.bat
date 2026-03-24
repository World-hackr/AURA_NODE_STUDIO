@echo off
setlocal
if "%~1"=="" (
    powershell -ExecutionPolicy Bypass -File "%~dp0tools\run_pio.ps1" -Action monitor
) else (
    powershell -ExecutionPolicy Bypass -File "%~dp0tools\run_pio.ps1" -Action monitor -Port %1
)
echo.
pause
