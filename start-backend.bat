@echo off
cd /d "%~dp0backend"
if not exist .env copy .env.example .env
pip install -r requirements.txt
python -m uvicorn server:app --reload --port 8001
pause
