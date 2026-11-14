@echo off
title SOLBOUND - Junior Astronaut Mission Trainer
cd /d "%~dp0"

echo ============================================
echo   SOLBOUND - Junior Astronaut Mission Trainer
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
  echo [1/2] Installing dependencies for the first time...
  call npm install
  if errorlevel 1 goto :failed
)

if not exist ".next\BUILD_ID" (
  echo [2/2] Building the game for the first time...
  call npm run build
  if errorlevel 1 goto :failed
)

echo.
echo Starting SOLBOUND on http://localhost:3010
echo Keep this window open while you play. Close it to stop the game.
echo.

start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 5; Start-Process 'http://localhost:3010'"
call npm run start -- -p 3010
goto :end

:failed
echo.
echo [ERROR] Setup failed. Check the messages above.
pause

:end
