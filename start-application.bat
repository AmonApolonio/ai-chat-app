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

REM Direct PowerShell command to build and launch both services
echo Starting backend and frontend in separate terminals...
powershell.exe -Command "Start-Process powershell -ArgumentList '-NoExit', '-Command', \"cd '%~dp0backend'; npm install; echo 'Cleaning previous build...'; if (Test-Path dist) { Remove-Item -Recurse -Force dist }; echo 'Building project...'; npm run build; if (Test-Path dist/main.js) { echo 'Build successful, starting server...'; npm run start } else { echo 'Build failed! main.js not found' }\""
powershell.exe -Command "Start-Process powershell -ArgumentList '-NoExit', '-Command', \"cd '%~dp0frontend'; `$env:PORT='%FRONTEND_PORT%'; npm install; echo 'Cleaning previous build...'; if (Test-Path build) { Remove-Item -Recurse -Force build }; echo 'Building project...'; npm run build; echo 'Build completed, starting development server...'; npm start\""

echo Application started in separate terminals.
echo Access the frontend at http://localhost:%FRONTEND_PORT%
echo Access the backend at http://localhost:%BACKEND_PORT%
