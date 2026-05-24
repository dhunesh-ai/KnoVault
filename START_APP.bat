@echo off
title KnoVault Dev Workflow Automation
color 0B
echo ===================================================
echo KnoVault Full Stack Startup
echo React Native + Expo ^| FastAPI ^| Neon DB ^| Firebase
echo ===================================================
echo.

if not exist "START_BACKEND.bat" (
    echo [ERROR] Must be run from the root of the KnoVault project.
    pause
    exit /b 1
)

echo [1/2] Starting Backend Server...
:: Using cmd /k to keep the window open if the script crashes
start "KnoVault Backend" cmd /k ".\START_BACKEND.bat"

echo.
echo [!] Waiting 5 seconds for backend to initialize...
timeout /t 5 /nobreak >nul

echo [2/2] Starting Mobile App...
:: Using cmd /k to keep the Metro window persistent
start "KnoVault Mobile" cmd /k ".\START_MOBILE.bat"

echo.
echo ===================================================
echo SERVICES BOOTING UP
echo ===================================================
echo 1. The FastAPI backend is running in the "KnoVault Backend" window.
echo 2. The Expo Dev Server is starting in the "KnoVault Mobile" window.
echo.
echo ACTION REQUIRED:
echo - Please bring the "KnoVault Mobile" window to the front.
echo - Unlock your Android phone and check for the USB Debugging prompt.
echo.
echo You can keep this window open or close it safely.
pause
