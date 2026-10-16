@echo off
TITLE ERP Frontend - Angular (:4200)
COLOR 0E
cd /d "%~dp0"
echo ===================================================
echo    ERP FRONTEND - ANGULAR APPLICATION (:4200)
echo ===================================================
echo.
call npm start -- --host 0.0.0.0 --port 4200
echo.
echo Frontend process ended.
pause
