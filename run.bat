@echo off
TITLE Bangladesh Real Estate ERP - Launcher
COLOR 0A
cd /d "%~dp0"

echo ===================================================================
echo    BANGLADESH REAL ESTATE ENTERPRISE ERP - 1-CLICK LAUNCHER
echo ===================================================================
echo.

:: 1. Detect Python
echo [1/4] Detecting Python environment...
if exist "%~dp0backend\venv\Scripts\python.exe" (
    echo [OK] Found Python Virtual Environment: backend\venv\Scripts\python.exe
) else (
    where python >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        echo [OK] Found System Python
    ) else (
        echo [ERROR] Python not found! Please install Python 3.10+ from python.org.
        pause
        exit /b 1
    )
)

:: 2. Detect Node.js / NPM
echo [2/4] Detecting Node.js / NPM...
where npm >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [OK] NPM found
) else (
    echo [ERROR] Node.js / NPM not found! Please install Node.js 18+ from nodejs.org.
    pause
    exit /b 1
)

:: 3. Launch Backend in a separate window
echo [3/5] Launching FastAPI Backend on http://localhost:8000 ...
start "ERP Backend - FastAPI (:8000)" "%~dp0backend\run.bat"

:: 4. Launch Celery Worker & Beat in separate windows
echo [4/5] Launching Celery Distributed Worker & Beat Scheduler...
start "ERP Celery Worker (PDC & NI138)" "%~dp0backend\run_celery_worker.bat"
start "ERP Celery Beat Scheduler (08:00 & 09:00 AM)" "%~dp0backend\run_celery_beat.bat"

:: 5. Launch Frontend in a separate window
echo [5/5] Launching Angular Frontend on http://localhost:4200 ...
start "ERP Frontend - Angular (:4200)" "%~dp0frontend\run.bat"

echo.
echo ===================================================================
echo    ALL SERVICES LAUNCHED SUCCESSFULLY!
echo ===================================================================
echo.
echo  * Frontend Web App     : http://localhost:4200
echo  * Backend API Docs     : http://localhost:8000/docs
echo  * Celery Worker        : Running (Pool: Solo, Queue: celery)
echo  * Celery Beat Scheduler: Active (Daily 08:00 AM PDC, 09:00 AM NI138)
echo.
echo Dedicated command windows are running for each service.
echo You can double-click 'stop.bat' at any time to stop all running services.
echo ===================================================================
echo.

:: Wait a few seconds and open browser
timeout /t 5 >nul
start http://localhost:4200

echo Done! Enjoy using Bangladesh Real Estate ERP.
pause
