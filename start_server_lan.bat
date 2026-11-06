@echo off
title SIM Penjadwalan UNU - Server Lokal LAN
color 0A

echo ========================================================
echo   SIM PENJADWALAN KULIAH BERBASIS ALGORITMA GENETIKA
echo           UNIVERSITAS NAHDLATUL ULAMA (UNU)
echo ========================================================
echo.

:: 1. Cek Service PostgreSQL
echo [1/3] Memeriksa Database PostgreSQL...
sc query postgresql-x64-16 | find "RUNNING" >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Menyalakan service PostgreSQL...
    net start postgresql-x64-16 >nul 2>&1
)
echo [OK] Database PostgreSQL siap.
echo.

:: 2. Jalankan Backend FastAPI (Port 8000)
echo [2/3] Menjalankan Server Backend API (FastAPI)...
start "SIM Jadwal - Backend FastAPI" cmd /k "cd /d %~dp0server && server\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

:: Beri jeda 3 detik agar backend aktif
timeout /t 3 /nobreak >nul

:: 3. Jalankan Frontend Next.js (Port 3000 terikat ke 0.0.0.0)
echo [3/3] Menjalankan Portal Web (Next.js)...
start "SIM Jadwal - Frontend Portal" cmd /k "cd /d %~dp0app && pnpm.cmd start -H 0.0.0.0 -p 3000"

echo.
echo ========================================================
echo   SERVER LOKAL BERHASIL DIAKTIFKAN!
echo ========================================================
echo   Akses dari PC Server : http://localhost:3000
echo   Akses dari HP/Laptop  : http://[IP_PC_INI]:3000
echo   (Contoh: http://192.168.1.100:3000)
echo ========================================================
echo Jendela backend dan frontend akan berjalan di latar belakang.
echo Jangan menutup jendela ini jika ingin server tetap menyala.
pause
