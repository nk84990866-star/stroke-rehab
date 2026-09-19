@echo off
cd /d "%~dp0"
echo =======================================================
echo Launching Interactive Stroke Rehabilitation Dashboard
echo =======================================================
".\.venv\Scripts\python.exe" rehab_dashboard.py
pause
