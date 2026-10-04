@echo off
title FreeLLM Hub & Gateway Server
cd /d "%~dp0"

echo ================================================================
echo           MENJALANKAN FREELLM HUB & GATEWAY LOKAL
echo ================================================================
echo.
echo [1/2] Membuka browser ke http://localhost:3000 ...
start "" http://localhost:3000
echo.
echo [2/2] Memulai server proxy backend (Port 3000)...
echo.
echo Tekan Ctrl+C jika ingin mematikan server.
echo ================================================================
echo.

node server.js

pause
