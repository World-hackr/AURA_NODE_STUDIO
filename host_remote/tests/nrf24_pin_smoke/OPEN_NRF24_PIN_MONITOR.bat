@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0..\tools\run_test_pio.ps1" -Action monitor -ProjectPath "%~dp0" -Environment nrf24_pin_smoke_esp32dev
pause
