@echo off
title Uji Otomatis - Smart Retail CRM & POS
cd /d "%~dp0"
echo ========================================================
echo   MENJALANKAN 100 UJI OTOMATIS VITEST (SEMUA SKENARIO)
echo ========================================================
echo.
"C:\Users\lenovo\.gemini\antigravity\bin\node.exe" "node_modules\vitest\vitest.mjs" run
echo.
echo ========================================================
echo   PENGUJIAN SELESAI
echo ========================================================
pause
