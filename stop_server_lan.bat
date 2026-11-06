@echo off
title Hentikan Server SIM Jadwal UNU
color 0C

echo Menghentikan Server SIM Penjadwalan UNU...

:: Matikan proses uvicorn / python di port 8000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    echo Menghentikan Backend (PID: %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

:: Matikan proses node / Next.js di port 3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo Menghentikan Frontend (PID: %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

echo [OK] Seluruh server lokal telah dihentikan dengan aman.
pause
