#!/usr/bin/env bash
set -e

echo "============================================================"
echo "  Turbo 2D Racing - Android APK Automated Build Pipeline"
echo "============================================================"
echo ""

# 1. Check Node.js
if ! command -v node &> /dev/null; then
    echo "[!] Node.js is not installed."
    echo "[*] Recommended shortcut: Push this code to GitHub and download the ready APK from GitHub Actions!"
    exit 1
fi

echo "[+] Node.js version: $(node -v)"
echo "[+] NPM version: $(npm -v)"

# 2. Install NPM dependencies
echo "[*] Installing NPM dependencies..."
npm install

# 3. Add Android platform if not present
if [ ! -d "android" ]; then
    echo "[*] Adding Capacitor Android platform..."
    npx cap add android
fi

# 4. Sync web assets
echo "[*] Syncing web assets and plugins..."
npx cap sync android

# 5. Build APK
if [ -f "android/gradlew" ]; then
    echo "[*] Compiling Android APK with Gradle..."
    chmod +x android/gradlew
    cd android
    ./gradlew assembleDebug
    cd ..
    
    if [ -f "android/app/build/outputs/apk/debug/app-debug.apk" ]; then
        echo ""
        echo "============================================================"
        echo "[SUCCESS] APK generated at:"
        echo "android/app/build/outputs/apk/debug/app-debug.apk"
        echo "============================================================"
    fi
else
    echo "[!] Gradle wrapper not found. Run 'npx cap open android' to build via Android Studio."
fi
