@echo off
REM Unified Startup Script for Restaurant Management System
REM This batch file starts both Frontend and Backend servers on Windows

title Restaurant Management System - Starting...

echo.
echo ================================
echo Restaurant Management System
echo ================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Get the project root directory
set PROJECT_ROOT=%~dp0
cd /d "%PROJECT_ROOT%"

REM Run the main startup script
echo [INFO] Starting servers...
echo.
node start-all.js

pause
