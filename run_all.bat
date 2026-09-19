@echo off
echo Starting NeuroMotion AI Rehabilitation System...

:: Start Backend (running from root directory so 'backend' module is found)
start "NeuroMotion API Backend" cmd /c "set PYTHONPATH=. && .venv\Scripts\python.exe -m backend.app"

:: Start Frontend
start "NeuroMotion Web Frontend" cmd /c "cd frontend && npm run dev"

:: Open the default web browser
start http://localhost:5173

echo System Started! The web application should open in your browser automatically.
pause
