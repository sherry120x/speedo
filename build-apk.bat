@echo off
setlocal enabledelayedexpansion

echo ============================================================
echo   Turbo 2D Racing - Android APK Automated Build Pipeline
echo ============================================================
echo.

:: Step 1: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Node.js is not found in your system PATH.
    echo.
    echo [*] EASIEST SHORTCUT (No PC Setup Required):
    echo     1. Push this folder to your GitHub repository.
    echo     2. Open your repository on GitHub and click on the 'Actions' tab.
    echo     3. Click 'Build Android APK' -> 'Run workflow'.
    echo     4. Within 2 minutes, download your ready 'Turbo-2D-Racing-debug.apk'!
    echo.
    echo [*] LOCAL BUILD REQUIREMENT:
    echo     Install Node.js (v18+) from https://nodejs.org
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
echo [*] Installing NPM dependencies and Capacitor packages...
call npm install
if %errorlevel% neq 0 (
    echo [X] npm install failed. Please check your internet connection.
    pause
    exit /b 1
)

:: Step 3: Add Android platform if missing
if not exist "android" (
    echo [*] Initializing Capacitor Android platform...
    call npx cap add android
    if %errorlevel% neq 0 (
        echo [X] Failed to add Android platform.
        pause
        exit /b 1
    )
) else (
    echo [+] Android platform directory already exists.
)

:: Step 4: Sync web assets & plugins
echo [*] Syncing web game assets (index.html, style.css, game.js) with Android...
call npx cap sync android
if %errorlevel% neq 0 (
    echo [X] Capacitor sync failed.
    pause
    exit /b 1
)

:: Step 5: Check Java JDK
echo [*] Checking Java JDK...
where javac >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [!] Java JDK or Android SDK was not detected locally.
    echo [+] Capacitor sync is COMPLETE. You have two options:
    echo.
    echo     Option A (Recommended - Instant & Free):
    echo     Push this project to GitHub. GitHub Actions will compile your APK
    echo     in the cloud and give you the direct download link in 2 minutes!
    echo.
    echo     Option B (Open in Android Studio):
    echo     Run: npx cap open android
    echo     And click Build -> Build Bundle(s) / APK(s) -> Build APK(s)
    echo.
    pause
    exit /b 0
)

:: Step 6: Build APK with Gradle
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
    echo.
    echo You can transfer this APK file to your Android phone to play!
) else (
    echo [!] Gradle finished, but the APK was not found at standard path.
    echo Try opening the project in Android Studio with: npx cap open android
)

pause
