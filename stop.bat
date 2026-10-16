@echo off
TITLE Bangladesh Real Estate ERP - Stop Services
COLOR 0C

echo ===================================================================
echo    STOPPING BANGLADESH REAL ESTATE ERP SERVICES
echo ===================================================================
echo.

:: Kill processes on port 8000 (Backend)
echo Stopping processes on Port 8000 (Backend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do (
    if not "%%a"=="" (
        taskkill /F /PID %%a >nul 2>nul
    )
)

:: Kill processes on port 4200 (Frontend)
echo Stopping processes on Port 4200 (Frontend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :4200') do (
    if not "%%a"=="" (
        taskkill /F /PID %%a >nul 2>nul
    )
)

:: Kill Celery Worker and Beat
echo Stopping Celery processes...
taskkill /F /IM celery.exe >nul 2>nul

echo.
echo ===================================================================
echo    ALL ERP SERVICES STOPPED!
echo ===================================================================
pause
