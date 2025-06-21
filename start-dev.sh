#!/bin/bash

# Check for .env file
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "\033[33mCreated .env from .env.example. Please edit .env to add your API key.\033[0m"
        exit 1
    else
        echo -e "\033[31m.env.example not found!\033[0m"
        exit 1
    fi
fi

echo -e "\033[32mStarting backend and frontend in separate terminals...\033[0m"
echo -e "\033[36mAccess the frontend at http://localhost:3000\033[0m"
echo -e "\033[36mAccess the backend at http://localhost:5000\033[0m"

# Get the directory of the script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_PATH="$SCRIPT_DIR/backend"
FRONTEND_PATH="$SCRIPT_DIR/frontend"

# Check which OS we're on
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS: use osascript to open new terminal windows
    osascript -e "tell application \"Terminal\"
        do script \"cd '$BACKEND_PATH' && npm install && npm run start:dev\"
    end tell"
    
    osascript -e "tell application \"Terminal\"
        do script \"cd '$FRONTEND_PATH' && export PORT=3000 && npm install && npm start\"
    end tell"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" || "$OSTYPE" == "cygwin" ]]; then
    # Windows: use start cmd for opening new windows
    start cmd /k "cd /d $BACKEND_PATH && npm install && npm run start:dev"
    start cmd /k "cd /d $FRONTEND_PATH && set PORT=3000 && npm install && npm start"
else
    # Linux or other Unix systems
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "cd '$BACKEND_PATH' && npm install && npm run start:dev; exec bash"
        gnome-terminal -- bash -c "cd '$FRONTEND_PATH' && export PORT=3000 && npm install && npm start; exec bash"
    elif command -v xterm &> /dev/null; then
        xterm -e "cd '$BACKEND_PATH' && npm install && npm run start:dev" &
        xterm -e "cd '$FRONTEND_PATH' && export PORT=3000 && npm install && npm start" &
    else
        echo -e "\033[31mNo supported terminal emulator found (gnome-terminal or xterm).\033[0m"
        echo -e "\033[31mPlease run these commands manually:\033[0m"
        echo -e "\033[33mcd '$BACKEND_PATH' && npm install && npm run start:dev\033[0m"
        echo -e "\033[33mcd '$FRONTEND_PATH' && export PORT=3000 && npm install && npm start\033[0m"
    fi
fi
