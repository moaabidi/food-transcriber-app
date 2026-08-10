@echo off
setlocal
cd /d %~dp0

echo Setting up Recipe Extractor...

where py >nul 2>nul
if errorlevel 1 (
  echo Python launcher not found. Install Python 3.11 or newer from python.org, then run this again.
  pause
  exit /b 1
)

if not exist .venv (
  py -3 -m venv .venv
)

call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt

if not exist .env (
  copy .env.example .env >nul
  echo.
  echo Created .env. Open it in Notepad and replace your_key_here with your OpenAI API key.
) else (
  echo .env already exists.
)

echo.
echo Setup complete.
echo Next: edit .env if needed, then double-click start.bat.
pause
