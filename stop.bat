@echo off
title Hentikan FreeLLM Hub
cd /d "%~dp0"

echo Menghentikan proses FreeLLM Hub di Port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo FreeLLM Hub berhasil dihentikan!
timeout /t 2 >nul
