@echo off
TITLE ERP Celery Worker - PDC & NI138 Background Tasks
COLOR 0D
cd /d "%~dp0"
echo ===================================================================
echo    BANGLADESH REAL ESTATE ERP - CELERY DISTRIBUTED WORKER
echo ===================================================================
echo.
echo Broker URL: redis://localhost:6379/0
echo Worker Pool: Solo (Windows Native Compatible)
echo.
if exist "venv\Scripts\celery.exe" (
    echo [OK] Launching Celery Worker using virtual environment...
    venv\Scripts\celery.exe -A app.core.celery_app.celery_app worker --loglevel=info --pool=solo
) else (
    echo [OK] Launching Celery Worker using system environment...
    celery -A app.core.celery_app.celery_app worker --loglevel=info --pool=solo
)
echo.
echo Celery worker stopped.
pause
