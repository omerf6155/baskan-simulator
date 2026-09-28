@echo off
title Buyuk Baskan - Futbol Simulatoru
echo ========================================================
echo       BUYUK BASKAN: FUTBOL KULUBU YONETIM SIMULATORU
echo ========================================================
echo.
echo Bilgisayardan oynamak icin tarayici aciliyor:
echo http://localhost:5055
echo.
echo Telefondan oynamak icin (ayni Wi-Fi uzerinden):
echo http://192.168.1.105:5055
echo.
echo ========================================================
start http://localhost:5055
if exist "%~dp0.venv\Scripts\python.exe" (
    "%~dp0.venv\Scripts\python.exe" "%~dp0server.py"
) else (
    "C:\Users\Victus\.local\bin\uv.exe" run --with fastapi --with uvicorn python "%~dp0server.py"
)
pause
