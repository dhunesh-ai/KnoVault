@echo off
echo Starting KnoVault Backend...
start "KnoVault Backend" cmd /k "cd backend && call venv\Scripts\activate && uvicorn main:app --reload"

echo Starting KnoVault Web Frontend...
start "KnoVault Web" cmd /k "cd web && npm run dev"

echo Both servers are starting in new windows!
