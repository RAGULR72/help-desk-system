@echo off
echo ================================================
echo    PROSERVE HELP DESK - FRONTEND SERVER
echo ================================================
echo.

cd /d "%~dp0"

echo [1/2] Checking Node.js...
node --version
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

echo.
echo [2/2] Starting Frontend (Vite)...
echo.
echo Press Ctrl+C to stop the server
echo ================================================
echo.

npm run dev

pause
