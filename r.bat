@echo off
setlocal

if "%~1"=="--child" goto :main
start "Buktidukung Helper" cmd /c "%~f0" --child
exit /b

:main
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting Administrator permission...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -ArgumentList '--child' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"
cls

node index.js
pause
