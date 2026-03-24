@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0..\tools\run_test_pio.ps1" -Action build -ProjectPath "%~dp0" -Environment blink_probe_esp32dev
pause
