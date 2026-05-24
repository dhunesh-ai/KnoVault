@echo off
title KnoVault Mobile (React Native + Expo)
color 0E
echo ===================================================
echo Starting KnoVault Mobile (Expo Dev Client)
echo ===================================================

if not exist "mobile" (
    echo [ERROR] Must be run from the root of the KnoVault project.
    pause
    exit /b 1
)

cd mobile

echo [1/4] Stopping Gradle Daemon...
if exist "android\gradlew.bat" (
    cd android
    call gradlew.bat --stop
    cd ..
)

echo.
echo [2/4] Resetting ADB connection...
adb kill-server
if exist "%USERPROFILE%\.android\adbkey*" del /F /Q "%USERPROFILE%\.android\adbkey*"
adb start-server

echo.
echo [3/4] Detecting Android device...
echo ---------------------------------------------------------
echo PLEASE LOOK AT YOUR PHONE SCREEN NOW!
echo If prompted, check "Always allow from this computer"
echo and tap "OK" to allow USB Debugging.
echo ---------------------------------------------------------

:: Wait up to 10 seconds for device
timeout /t 5 /nobreak >nul
adb wait-for-device

echo.
echo [4/4] Starting Expo build and Metro bundler...
set EXPO_USE_LOCAL_ADB=1
set EXPO_NO_TELEMETRY=1

:: Extract device ID
set "DEVICE_ID="
for /f "tokens=1" %%i in ('adb devices ^| findstr "device" ^| findstr /v "List"') do set DEVICE_ID=%%i

if "%DEVICE_ID%"=="" (
    echo [WARNING] No authorized device found automatically.
    echo [!] Starting Metro Bundler only...
    npx expo start
) else (
    echo [!] Running on device: %DEVICE_ID%
    npx expo run:android --device
)

echo.
echo [!] Expo process exited or crashed. This window will stay open to read logs.
pause
