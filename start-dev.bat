@echo off
echo Starting Chat Application in Development Mode
echo =============================================

REM Create uploads directory if it doesn't exist
if not exist ".\backend\uploads" (
  echo Creating uploads directory...
  mkdir ".\backend\uploads"
)

REM Check if the environment file exists in main folder
if not exist ".\.env" (
  echo Creating .env file from template...
  if exist ".\.env.example" (
    copy .\.env.example .\.env
    echo Please edit .\.env to add your OpenAI API key before starting again.
    exit /b 1
  ) else (
    echo Warning: .env.example not found. You may need to create .env manually.
  )
)

REM Set default ports
set BACKEND_PORT=5000
set FRONTEND_PORT=3000

REM Direct PowerShell command to launch both services
echo Starting backend and frontend in separate terminals...
powershell.exe -Command "Start-Process powershell -ArgumentList '-NoExit', '-Command', \"cd '%~dp0backend'; npm install; npm run start:dev\"" 
powershell.exe -Command "Start-Process powershell -ArgumentList '-NoExit', '-Command', \"cd '%~dp0frontend'; `$env:PORT='%FRONTEND_PORT%'; npm install; npm start\""

echo Application started in separate terminals.
echo Access the frontend at http://localhost:%FRONTEND_PORT%
echo Access the backend at http://localhost:%BACKEND_PORT%
