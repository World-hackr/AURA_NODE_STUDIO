@echo off
setlocal
powershell -ExecutionPolicy Bypass -File "%~dp0tools\run_pio.ps1" -Action build
echo.
pause
