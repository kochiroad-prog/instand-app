@echo off
title INSTAND App - Setup & Run
color 1F

echo.
echo  ==========================================
echo   INSTAND APP - Setup Otomatis
echo  ==========================================
echo.

echo [1/3] Menginstall dependencies...
call npm install
if %errorlevel% neq 0 (
  echo.
  echo ERROR: npm install gagal. Pastikan Node.js sudah terinstall.
  echo Download di: https://nodejs.org
  pause
  exit /b 1
)

echo.
echo [2/3] Dependencies berhasil diinstall!
echo.
echo [3/3] LANGKAH WAJIB SEBELUM LANJUT:
echo.
echo  Buka Supabase Dashboard Anda:
echo  https://supabase.com/dashboard/project/wslumguauxmtkqmyzyfu
echo.
echo  Masuk ke: SQL Editor
echo  Copy paste isi file: supabase\schema.sql
echo  Klik RUN untuk membuat tabel dan isi data
echo.
echo  ==========================================
echo.
set /p confirm="Sudah jalankan schema.sql di Supabase? (y/n): "
if /i "%confirm%" neq "y" (
  echo Silakan jalankan schema.sql dulu, lalu ulangi setup.
  pause
  exit /b
)

echo.
echo  Menjalankan INSTAND App di mode development...
echo  Buka browser: http://localhost:3000
echo.
call npm run dev
pause
