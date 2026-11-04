@echo off
title Smart Retail CRM & POS - Toko Sembako
cd /d "%~dp0"
echo ========================================================
echo   MENJALANKAN SMART RETAIL CRM & POS (TOKO SEMBAKO)
echo ========================================================
echo.
echo Membuka aplikasi di browser: http://localhost:3000 ...
start http://localhost:3000
echo.
echo Server aktif. Tekan CTRL+C di jendela ini untuk mematikan.
echo.
"C:\Users\lenovo\.gemini\antigravity\bin\node.exe" "node_modules\next\dist\bin\next" start -p 3000
pause
