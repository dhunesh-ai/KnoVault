@echo off
title KnoVault Standalone APK Builder
color 0B
set "WORKSPACE=%~dp0"
if "%WORKSPACE:~-1%"=="\" set "WORKSPACE=%WORKSPACE:~0,-1%"

echo ===================================================
echo KnoVault Standalone APK Builder
echo React Native + Expo ^| Gradle Local Build
echo ===================================================
echo.
echo Please select the build environment:
echo [1] Production Mode (Connects to Render: https://knovault-jbph.onrender.com)
echo [2] Local Standalone Mode (Connects to your local machine's IP)
echo [3] Exit
echo.
set /p CHOICE="Enter choice (1-3): "

if "%CHOICE%"=="1" goto build_prod
if "%CHOICE%"=="2" goto build_local
if "%CHOICE%"=="3" exit /b 0
echo [ERROR] Invalid choice.
pause
exit /b 1

:build_prod
set "API_URL=https://knovault-jbph.onrender.com"
set "OVERRIDE_VAL=null"
echo [!] Selected Production Mode: %API_URL%
goto start_build

:build_local
echo [!] Detecting local IP address...
for /f "usebackq tokens=*" %%i in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.*' -and $_.InterfaceAlias -notlike '*Loopback*'} | Select-Object -First 1).IPAddress"`) do set "LOCAL_IP=%%i"

if "%LOCAL_IP%"=="" (
    echo [WARNING] Could not automatically detect local IP address.
    set /p LOCAL_IP="Please enter your computer's local IP address (e.g. 192.168.1.15): "
)

if "%LOCAL_IP%"=="" (
    echo [ERROR] No IP address provided. Aborting build.
    pause
    exit /b 1
)

set "API_URL=http://%LOCAL_IP%:8000"
set "OVERRIDE_VAL='%API_URL%'"
echo [!] Selected Local Standalone Mode: %API_URL%
goto start_build

:start_build
echo.
echo [1/6] Injecting configuration to buildConfig.ts...
echo /** > "%WORKSPACE%\mobile\src\config\buildConfig.ts"
echo  * KnoVault -- Build configuration override. >> "%WORKSPACE%\mobile\src\config\buildConfig.ts"
echo  * This file is automatically updated by BUILD_APK.bat during compiling. >> "%WORKSPACE%\mobile\src\config\buildConfig.ts"
echo  * Do not modify this manually unless you want to hardcode an override. >> "%WORKSPACE%\mobile\src\config\buildConfig.ts"
echo  */ >> "%WORKSPACE%\mobile\src\config\buildConfig.ts"
echo export const buildConfig = { >> "%WORKSPACE%\mobile\src\config\buildConfig.ts"
echo   API_URL_OVERRIDE: %OVERRIDE_VAL%, >> "%WORKSPACE%\mobile\src\config\buildConfig.ts"
echo }; >> "%WORKSPACE%\mobile\src\config\buildConfig.ts"

echo.
echo [2/6] Stopping any running Gradle Daemons (to release file locks)...
cd "%WORKSPACE%\mobile\android"
call .\gradlew.bat --stop 2>nul

echo.
echo [3/6] Cleaning Android build cache (manual delete to avoid CMake race conditions)...
echo        Deleting app\build directory...
if exist "%WORKSPACE%\mobile\android\app\build" (
    rmdir /s /q "%WORKSPACE%\mobile\android\app\build" 2>nul
    if exist "%WORKSPACE%\mobile\android\app\build" (
        echo [WARNING] Some files could not be deleted. Retrying after short delay...
        timeout /t 3 /nobreak >nul
        rmdir /s /q "%WORKSPACE%\mobile\android\app\build" 2>nul
    )
)
echo        Deleting app\.cxx directory...
if exist "%WORKSPACE%\mobile\android\app\.cxx" (
    rmdir /s /q "%WORKSPACE%\mobile\android\app\.cxx" 2>nul
)
echo        Deleting root build directory...
if exist "%WORKSPACE%\mobile\android\build" (
    rmdir /s /q "%WORKSPACE%\mobile\android\build" 2>nul
)
echo        Clean complete.

echo.
echo [4/6] Building Standalone APK (bundling JS + compiling native code)...
echo        This may take 10-15 minutes on the first build.
echo.
call .\gradlew.bat assembleRelease --no-daemon

if %ERRORLEVEL% NEQ 0 (
    if not exist "%WORKSPACE%\mobile\android\app\build\outputs\apk\release\app-release.apk" (
        echo.
        echo ===================================================
        echo [ERROR] Gradle assembleRelease failed!
        echo ===================================================
        echo.
        echo Common fixes:
        echo   1. Try running this script again (transient CMake errors)
        echo   2. Check if another process is using the build directory
        echo   3. Run: cd mobile\android ^&^& .\gradlew.bat assembleRelease --stacktrace
        echo.
        goto error_cleanup
    )
)

echo.
echo [5/6] Verifying APK was generated...
set "APK_SOURCE=%WORKSPACE%\mobile\android\app\build\outputs\apk\release\app-release.apk"

if not exist "%APK_SOURCE%" (
    echo.
    echo [ERROR] APK not found at expected location:
    echo         %APK_SOURCE%
    echo.
    echo Searching for APK in build outputs...
    dir /s /b "%WORKSPACE%\mobile\android\app\build\outputs\*.apk" 2>nul
    goto error_cleanup
)

echo        APK found: %APK_SOURCE%

echo.
echo [6/6] Copying generated APK to build-output folder...
if not exist "%WORKSPACE%\build-output" mkdir "%WORKSPACE%\build-output"
copy /Y "%APK_SOURCE%" "%WORKSPACE%\build-output\KnoVault.apk"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to copy the APK to the build-output directory!
    goto error_cleanup
)

echo ===================================================
echo BUILD SUCCESSFUL!
echo ===================================================
echo.
echo The standalone APK is ready for distribution:
echo - Location: %WORKSPACE%\build-output\KnoVault.apk
echo - Environment: %API_URL%
echo.
echo You can share this APK to WhatsApp and install it on your device.
goto success_cleanup

:error_cleanup
echo [!] Cleaning up due to error...
call :restore_default
pause
exit /b 1

:success_cleanup
call :restore_default
echo Press any key to exit.
pause
exit /b 0

:restore_default
echo.
echo [!] Restoring buildConfig.ts to defaults...
echo /** > "%WORKSPACE%\mobile\src\config\buildConfig.ts"
echo  * KnoVault -- Build configuration override. >> "%WORKSPACE%\mobile\src\config\buildConfig.ts"
echo  * This file is automatically updated by BUILD_APK.bat during compiling. >> "%WORKSPACE%\mobile\src\config\buildConfig.ts"
echo  * Do not modify this manually unless you want to hardcode an override. >> "%WORKSPACE%\mobile\src\config\buildConfig.ts"
echo  */ >> "%WORKSPACE%\mobile\src\config\buildConfig.ts"
echo export const buildConfig = { >> "%WORKSPACE%\mobile\src\config\buildConfig.ts"
echo   API_URL_OVERRIDE: null, >> "%WORKSPACE%\mobile\src\config\buildConfig.ts"
echo }; >> "%WORKSPACE%\mobile\src\config\buildConfig.ts"
goto :eof
