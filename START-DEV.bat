@echo off
title SOLBOUND - Dev Mode
cd /d "%~dp0"

echo ============================================
echo   SOLBOUND - Development Mode (hot reload)
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed.
  echo Install it from https://nodejs.org and run this file again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies for the first time...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
)

echo.
echo Starting SOLBOUND dev server on http://localhost:3010
echo Keep this window open while you play. Close it to stop the server.
echo.

start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 6; Start-Process 'http://localhost:3010'"
call npm run dev -- -p 3010
pause
