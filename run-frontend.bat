@echo off
echo Starting Chat App Frontend (Development Mode)...
cd %~dp0frontend
echo Installing dependencies...
call npm install
echo.
echo Setting up environment...
set PORT=4200
echo Frontend server running in development mode at http://localhost:4200
npm start
