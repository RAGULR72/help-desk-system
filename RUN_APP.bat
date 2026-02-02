@echo off
setlocal
title Proserve Help Desk - Control Panel

echo ============================================================
echo           PROSERVE HELP DESK - STARTUP CONTROL
echo ============================================================
echo.
echo  This script will start both the Backend and Frontend 
echo  servers in separate windows.
echo.
echo  Backend: PostgreSQL @ Port 8000
echo  Frontend: Vite UI @ Port 5173
echo.
echo ============================================================
echo.

REM Set directories
set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"

echo [1/2] Launching Backend Server...
start "PROSERVE BACKEND" cmd /c "cd /d "%BACKEND_DIR%" && start_backend.bat"

echo.
echo [2/2] Launching Frontend Server...
start "PROSERVE FRONTEND" cmd /c "cd /d "%FRONTEND_DIR%" && start_frontend.bat"

echo.
echo ============================================================
echo  SUCCESS: Both servers are initializing!
echo.
echo  Please check the new windows for status and logs.
echo ============================================================
echo.
echo  Press any key to close this control window...
pause > nul
