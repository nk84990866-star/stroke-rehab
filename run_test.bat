@echo off
cd /d "%~dp0"
echo =======================================================
echo Running Kinematics Test Suite (Unit 1 and Unit 2)
echo =======================================================
".\.venv\Scripts\python.exe" test_kinematics.py
pause
