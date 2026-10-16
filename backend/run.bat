@echo off
TITLE ERP Backend - FastAPI (:8000)
COLOR 0B
cd /d "%~dp0"
echo ===================================================
echo    ERP BACKEND - FASTAPI SERVICE (:8000)
echo ===================================================
echo.
if exist "venv\Scripts\python.exe" (
    echo [OK] Using virtual environment Python
    venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
) else (
    echo [OK] Using system Python
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
)
echo.
echo Backend process ended.
pause
