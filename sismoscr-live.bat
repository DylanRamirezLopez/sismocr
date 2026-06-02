@echo off
title SismosCR - Launcher
cd /d "%~dp0"

echo =====================================================
echo   SismosCR - Live Dev Server
echo   Monitoreo Sismico en Tiempo Real
echo =====================================================
echo.
echo  Iniciando Backend API...
:: /D sets working directory, avoids nested-quote issues with cmd /c
start "SismosCR API" /D "%~dp0backend" cmd /c "python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --log-level warning"
timeout /t 3 /nobreak >nul

echo  Iniciando Worker de ingesta...
start "SismosCR Worker" /D "%~dp0backend" cmd /c "python -m app.workers.ingestion_worker"

echo  Iniciando Frontend...
timeout /t 1 /nobreak >nul
start "" http://localhost:3000
cd /d "%~dp0sismoscr"
npm run dev

pause
