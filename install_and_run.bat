@echo off
echo ============================================================
echo   GMVCU SENS BOT - Installing dependencies
echo ============================================================
echo.

pip install flask flask-cors requests

echo.
echo ============================================================
echo   Dependencies installed! Starting proxy...
echo ============================================================
echo.

python bmf_proxy.py
