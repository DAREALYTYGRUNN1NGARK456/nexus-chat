@echo off
title Nexus Chat

echo.
echo  ==========================================
echo         Nexus Chat - Desktop App
echo  ==========================================
echo.
echo  What would you like to do?
echo.
echo  [1] Dev Mode   (opens app window with hot reload)
echo  [2] Build      (creates .exe / .msi installer)
echo  [3] Exit
echo.
set /p choice=" Enter 1, 2 or 3: "

if "%choice%"=="1" goto dev
if "%choice%"=="2" goto build
if "%choice%"=="3" goto end

echo  Invalid choice, please try again.
pause
goto start

:dev
echo.
echo  Starting Nexus in dev mode...
echo.
npm run tauri:dev
pause
goto end

:build
echo.
echo  Building Nexus installer...
echo.
npm run tauri:build
echo.
echo  Done! Check src-tauri\target\release\bundle\ for your installer.
pause
goto end

:end
exit