@echo off
title Buyuk Baskan - Futbol Simulatoru
echo ========================================================
echo       BUYUK BASKAN: FUTBOL KULUBU YONETIM SIMULATORU
echo ========================================================
echo.

set CURRENT_IP=192.168.1.39
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set CURRENT_IP=%%a
    goto :ip_done
)
:ip_done
set CURRENT_IP=%CURRENT_IP: =%

echo Bilgisayardan oynamak icin (Yerel):
echo http://localhost:5055
echo.
echo Telefondan oynamak icin (Ayni Wi-Fi uzerinden):
echo http://%CURRENT_IP%:5055
echo.
echo Veya Canli Bulut Linki (Internet olan her yerden):
echo https://baskan-simulator.onrender.com
echo ========================================================
echo.
start http://localhost:5055
if exist "%~dp0.venv\Scripts\python.exe" (
    "%~dp0.venv\Scripts\python.exe" "%~dp0server.py"
) else (
    "C:\Users\Victus\.local\bin\uv.exe" run --with fastapi --with uvicorn python "%~dp0server.py"
)
pause
