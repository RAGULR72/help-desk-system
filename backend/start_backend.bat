@echo off
echo ================================================
echo    PROSERVE HELP DESK - BACKEND SERVER
echo    PostgreSQL Database
echo ================================================
echo.

cd /d "%~dp0"

echo [1/2] Checking Python...
python --version
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    pause
    exit /b 1
)

echo [2/3] Activating Virtual Environment...
if exist venv\Scripts\activate (
    call venv\Scripts\activate
    echo Virtual environment activated.
) else (
    echo Note: venv not found, using global python.
)

echo.
echo [3/3] Starting Backend Server...
echo Server will run on: http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop the server
echo ================================================
echo.

python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

pause
