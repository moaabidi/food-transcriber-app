@echo off
setlocal
cd /d %~dp0

if not exist .venv\Scripts\python.exe (
  echo Recipe Extractor is not set up yet.
  echo Double-click setup.bat first.
  pause
  exit /b 1
)

if not exist .env (
  echo Missing .env file. Run setup.bat first.
  pause
  exit /b 1
)

echo Recipe Extractor helper is running.
echo Keep this window open while you use the Chrome extension.
echo You can minimize it.
echo.
.venv\Scripts\python.exe app.py
pause
