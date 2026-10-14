@echo off
echo ============================================================
echo   Turbo 2D Racing - Push to GitHub
echo ============================================================
echo.

set "PATH=%LOCALAPPDATA%\MinGit\cmd;%PATH%"

echo [*] Checking Git status...
git status
echo.

echo [*] Pushing main branch to https://github.com/sherry120x/speedo.git ...
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ============================================================
    echo [SUCCESS] Code pushed to GitHub successfully!
    echo.
    echo Go to: https://github.com/sherry120x/speedo/actions
    echo to download your ready Android .apk file in 2 minutes!
    echo ============================================================
) else (
    echo.
    echo [!] Push failed or cancelled. Please make sure you are signed into GitHub.
)

pause
