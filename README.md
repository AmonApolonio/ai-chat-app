# Chat App with PDF Support

This is a chat application with PDF document processing capability. The app features a React frontend and a NestJS backend, using LangChain and OpenAI for intelligent chat responses and PDF document analysis.

## Features

- Real-time chat application
- PDF document upload and analysis
- AI-powered responses using OpenAI
- Rate limiting guard for API protection
- Web search capability with LangChain agent
- Modern React UI with Tailwind CSS
- Docker support for deployment

## Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API Key (required for chat functionality)
- Docker and Docker Compose (for deployment)

## Project Structure

- `frontend/` - React application with Tailwind CSS
- `backend/` - NestJS application with LangChain integration
- `docker-compose.yml` - Docker Compose configuration for production deployment

## Quick Start - Local Development

### Running with Script

1. Create and configure the environment file:
   ```
   copy .env.example .env
   ```
   Then edit `.env` to add your OpenAI API key

2. Start the application:
   ```
   ./start-application.bat   # Windows
   ./start-application.sh    # macOS/Linux
   ```

3. Access the app at http://localhost:3000

### Running with VS Code Tasks

1. Create and configure the environment file as shown above

2. Run the VS Code task:
   - Open Command Palette (Ctrl+Shift+P)
   - Select "Tasks: Run Task" 
   - Choose "Start Chat App"

### Running Manually

#### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Create the environment file in the root directory if needed:
   ```
   cd ..
   copy .env.example .env
   ```

3. Install and start:
   ```
   npm install
   npm run start:dev
   ```

The backend will be available at http://localhost:5000

#### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install and start:
   ```
   npm install
   npm start
   ```

The frontend will be available at http://localhost:3000

## Docker Deployment

To run the application using Docker:

1. Create the environment file:
   ```
   copy .env.example .env
   ```

2. Edit the `.env` file and add your OpenAI API key:
   ```
   LLM_API_KEY=your_openai_api_key
   ```

3. Build and start the containers:
   ```
   docker-compose build --no-cache
   docker compose up -d
   ```

4. Access the application at http://localhost:3000

### Stopping Docker Services

```
docker compose down
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| LLM_API_KEY | OpenAI API Key | (required) |
| LLM_MODEL | OpenAI Model to use | gpt-4o-mini |
