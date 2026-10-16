@echo off
TITLE ERP Celery Beat Scheduler - Daily 08:00 & 09:00 AM Cron
COLOR 0E
cd /d "%~dp0"
echo ===================================================================
echo    BANGLADESH REAL ESTATE ERP - CELERY BEAT DISTRIBUTED SCHEDULER
echo ===================================================================
echo.
echo Timezone: Asia/Dhaka
echo Schedule:
echo   - 08:00 AM: PDC Cheque 3-Day Maturation SMS Dispatch
echo   - 09:00 AM: NI Act 1881 Sec 138 Statutory Litigation Deadlines
echo.
if exist "venv\Scripts\celery.exe" (
    echo [OK] Launching Celery Beat using virtual environment...
    venv\Scripts\celery.exe -A app.core.celery_app.celery_app beat --loglevel=info
) else (
    echo [OK] Launching Celery Beat using system environment...
    celery -A app.core.celery_app.celery_app beat --loglevel=info
)
echo.
echo Celery beat scheduler stopped.
pause
