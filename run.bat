@echo off
TITLE Bangladesh Real Estate ERP - Launcher
COLOR 0A

:: Switch to script directory
cd /d "%~dp0"

echo ===================================================================
echo    BANGLADESH REAL ESTATE ENTERPRISE ERP - 1-CLICK LAUNCHER
echo ===================================================================
echo.

:: 1. Detect Python
echo [1/4] Detecting Python environment...
set "PYTHON_EXE=python"
if exist "backend\venv\Scripts\python.exe" (
    set "PYTHON_EXE=backend\venv\Scripts\python.exe"
    echo [OK] Using virtual environment Python: backend\venv\Scripts\python.exe
) else (
    where python >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        echo [OK] Using system Python
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
echo [3/4] Launching FastAPI Backend on http://localhost:8000 ...
start "ERP Backend - FastAPI (:8000)" cmd /c "cd /d "%~dp0backend" && %PYTHON_EXE% -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

:: 4. Launch Frontend in a separate window
echo [4/4] Launching Angular Frontend on http://localhost:4200 ...
start "ERP Frontend - Angular (:4200)" cmd /c "cd /d "%~dp0frontend" && npm start -- --host 0.0.0.0 --port 4200"

echo.
echo ===================================================================
echo    ALL SERVICES LAUNCHED SUCCESSFULLY!
echo ===================================================================
echo.
echo  * Frontend App : http://localhost:4200
echo  * Backend Docs : http://localhost:8000/docs
echo.
echo Two command windows have been opened for Backend and Frontend.
echo Closing those windows will stop the respective services.
echo You can also run 'stop.bat' to stop all running ERP services.
echo ===================================================================
echo.

:: Optionally open browser after 3 seconds
timeout /t 3 >nul
start http://localhost:4200

echo Done! Enjoy using Bangladesh Real Estate ERP.
pause
