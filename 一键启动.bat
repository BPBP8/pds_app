@echo off
setlocal
cd /d "%~dp0"

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\preview.ps1" %*
set "PDS_EXIT_CODE=%ERRORLEVEL%"

if not "%PDS_EXIT_CODE%"=="0" (
    echo.
    echo Startup failed. Review the message above, then press any key to close.
    pause >nul
)

exit /b %PDS_EXIT_CODE%
