@echo off
setlocal
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\start_board_data.ps1" -OpenBrowser
