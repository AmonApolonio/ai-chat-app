#!/bin/bash

echo -e "\033[1;32mStarting Chat Application in Development Mode\033[0m"
echo -e "\033[1;32m=============================================\033[0m"

# Create uploads directory if it doesn't exist
if [ ! -d "./backend/uploads" ]; then
    echo -e "\033[33mCreating uploads directory...\033[0m"
    mkdir -p ./backend/uploads
    chmod 777 ./backend/uploads
fi

# Check for .env file
if [ ! -f ".env" ]; then
    echo -e "\033[33mCreating .env file from template...\033[0m"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "\033[33mPlease edit .env to add your OpenAI API key before starting again.\033[0m"
        exit 1
    else
        echo -e "\033[33mWarning: .env.example not found. You may need to create .env manually.\033[0m"
    fi
fi

# Set default ports
BACKEND_PORT=5000
FRONTEND_PORT=3000

echo -e "\033[32mStarting backend and frontend in separate terminals...\033[0m"

# Get the directory of the script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_PATH="$SCRIPT_DIR/backend"
FRONTEND_PATH="$SCRIPT_DIR/frontend"

# Define backend and frontend start commands with cleanup and build
BACKEND_CMD="cd '$BACKEND_PATH' && npm install && echo 'Cleaning previous build...' && rm -rf dist && echo 'Building project...' && npm run build && if [ -f dist/main.js ]; then echo 'Build successful, starting server...' && npm run start; else echo 'Build failed! main.js not found'; fi"
FRONTEND_CMD="cd '$FRONTEND_PATH' && export PORT=$FRONTEND_PORT && npm install && echo 'Cleaning previous build...' && rm -rf build && echo 'Building project...' && npm run build && echo 'Build completed, starting development server...' && npm start"

# Check which OS we're on
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS: use osascript to open new terminal windows
    osascript -e "tell application \"Terminal\"
        do script \"$BACKEND_CMD\"
    end tell"
    
    osascript -e "tell application \"Terminal\"
        do script \"$FRONTEND_CMD\"
    end tell"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" || "$OSTYPE" == "cygwin" ]]; then
    # Windows: use start cmd for opening new windows
    start cmd /k "$BACKEND_CMD"
    start cmd /k "$FRONTEND_CMD"
else
    # Linux or other Unix systems
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "$BACKEND_CMD; exec bash"
        gnome-terminal -- bash -c "$FRONTEND_CMD; exec bash"
    elif command -v xterm &> /dev/null; then
        xterm -e "$BACKEND_CMD" &
        xterm -e "$FRONTEND_CMD" &
    else
        echo -e "\033[31mNo supported terminal emulator found (gnome-terminal or xterm).\033[0m"
        echo -e "\033[31mPlease run these commands manually:\033[0m"
        echo -e "\033[33m$BACKEND_CMD\033[0m"
        echo -e "\033[33m$FRONTEND_CMD\033[0m"
    fi
fi

echo -e "\033[32mApplication started in separate terminals.\033[0m"
echo -e "\033[36mAccess the frontend at http://localhost:$FRONTEND_PORT\033[0m"
echo -e "\033[36mAccess the backend at http://localhost:$BACKEND_PORT\033[0m"
