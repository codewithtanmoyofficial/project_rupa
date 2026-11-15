@echo off
title Greenfield Polytechnic CMS
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Download the LTS version from https://nodejs.org , install it, then double-click this file again.
  pause
  exit /b 1
)

if not exist "server\node_modules" goto setup
if not exist "client\dist\index.html" goto setup
goto check

:setup
echo First run: installing packages (needs internet, takes a minute)...
call npm run setup
if errorlevel 1 (
  echo.
  echo Setup failed. Copy the red text above and send it to the developer.
  pause
  exit /b 1
)

:check
call npm run doctor
if errorlevel 1 (
  echo.
  echo Fix the [FAIL] items above, then double-click start.bat again.
  pause
  exit /b 1
)

echo.
echo Starting... the browser opens by itself in a few seconds. Keep this window open.
start "" cmd /c "timeout /t 8 >nul & start http://localhost:5000"
call npm start
echo.
echo The server stopped. Read the message above.
pause
