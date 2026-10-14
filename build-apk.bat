@echo off
setlocal enabledelayedexpansion

echo ============================================================
echo   Turbo 2D Racing (Speedo) - Android APK Build Pipeline
echo ============================================================
echo.

:: Step 1: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Node.js is not found in your system PATH.
    echo.
    echo [*] EASIEST SHORTCUT: Check GitHub Actions at https://github.com/sherry120x/speedo/actions
    echo.
    pause
    exit /b 1
)

echo [+] Node.js detected:
node -v
echo [+] NPM detected:
npm -v
echo.

:: Step 2: Install dependencies
echo [*] Installing NPM dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [X] npm install failed.
    pause
    exit /b 1
)

:: Step 3: Stage web assets
echo [*] Staging web assets in www/...
if not exist "www" mkdir www
copy /Y index.html www\ >nul
copy /Y style.css www\ >nul
copy /Y game.js www\ >nul
copy /Y manifest.json www\ >nul
copy /Y sw.js www\ >nul
copy /Y icon-192.png www\ >nul
copy /Y icon-512.png www\ >nul

:: Step 4: Add Android platform if missing
if not exist "android" (
    echo [*] Initializing Capacitor Android platform...
    call npx cap add android
    if %errorlevel% neq 0 (
        echo [X] Failed to add Android platform.
        pause
        exit /b 1
    )
) else (
    echo [+] Android platform directory exists.
)

:: Step 5: Sync web assets & plugins
echo [*] Syncing web assets with Android...
call npx cap sync android
if %errorlevel% neq 0 (
    echo [X] Capacitor sync failed.
    pause
    exit /b 1
)

:: Step 6: Build APK
echo [*] Compiling Android Debug APK via Gradle...
cd android
call gradlew.bat assembleDebug
cd ..

if exist "android\app\build\outputs\apk\debug\app-debug.apk" (
    echo.
    echo ============================================================
    echo [SUCCESS] APK compiled successfully!
    echo Location: android\app\build\outputs\apk\debug\app-debug.apk
    echo ============================================================
)

pause
