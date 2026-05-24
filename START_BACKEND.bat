@echo off
title KnoVault Backend Server
color 0A
echo ===================================================
echo Starting KnoVault Backend (FastAPI + Neon PostgreSQL)
echo ===================================================

if not exist "backend" (
    echo [ERROR] Must be run from the root of the KnoVault project.
    pause
    exit /b 1
)

cd backend

:: Check if virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo [!] Virtual environment not found. Creating one...
    python -m venv venv
    call venv\Scripts\activate
    echo [!] Installing requirements...
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate
)

echo.
echo [1/2] Preparing backend services (Neon DB, Firebase)...
echo [2/2] Starting Uvicorn Development Server...
echo.

set PYTHONUTF8=1
uvicorn main:app --reload --host 0.0.0.0 --port 8000

echo.
echo [!] Server process exited or crashed. This window will stay open to read logs.
pause
