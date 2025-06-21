# AI-Powered Chat Platform with PDF Analysis & Web Research

This is my solution to the "48 hours" Interview code challenge. It's a chat application with PDF document processing capability, featuring a React frontend and a NestJS backend, using LangChain and OpenAI for intelligent chat responses and PDF document analysis.

<div align="center">
  <table>
    <tr>
      <td align="center"><b>PDF Analysis</b></td>
      <td align="center"><b>Web Research</b></td>
    </tr>
    <tr>
      <td><img src="./assets/pdf-demo.gif" width="400"/></td>
      <td><img src="./assets/research-demo.gif" width="400"/></td>
    </tr>
  </table>
</div>

## More Reading

- [Architecture Overview](architecture-overview.md): How the whole system works (with added improvements!)
- [Agent Details](agent-details.md): Meet the AI agents that power the app
- [Usage Guide](usage-guide.md): Tips and examples to get the most out of the app
- [Assignment Description](assignment-description.md): The original challenge requirements

## Prerequisites

### For Docker Deployment
- Docker and Docker Compose
- OpenAI API Key (required for chat functionality)

### For Local Development
- Node.js 18+
- npm
- Python 3.x
- Visual Studio Build Tools (C++ build tools)
- OpenAI API Key (required for chat functionality)

## Getting Started

### The Easy Way

1. Create your environment file:
   ```
   copy .env.example .env
   ```
   Open the file and put your OpenAI API key in there

2. Start everything with one command:
   ```
   ./start-application.bat   # for Windows
   ```
   ```
   ./start-application.sh    # for Mac or Linux
   ```

3. Go to http://localhost:3000 in your browser

### Using VS Code

1. Set up the environment file like shown above

2. Use the built-in task:
   - Press Ctrl+Shift+P
   - Type "Tasks: Run Task" 
   - Click on "Start Chat App"

### Starting Pieces Separately

#### Backend First

1. Go to the backend folder:
   ```
   cd backend
   ```

2. Make sure you have the environment file in the main folder:
   ```
   cd ..
   copy .env.example .env
   ```

3. Install and start it:
   ```
   npm install
   npm run start:dev
   ```

This starts the backend at http://localhost:5000

#### Then Frontend

1. Open a new terminal and go to the frontend folder:
   ```
   cd frontend
   ```

2. Install and start it:
   ```
   npm install
   npm start
   ```

Now you can access the app at http://localhost:3000

## Using Docker

Want to use containers? It's easy:

1. Set up your environment:
   ```
   copy .env.example .env
   ```

2. Add your API key to the `.env` file:
   ```
   LLM_API_KEY=your_openai_api_key
   ```

3. Build and start everything:
   ```
   docker-compose build --no-cache
   docker compose up -d
   ```

4. Visit http://localhost:3000

### Shutting Down

When you're done:
```
docker compose down
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| LLM_API_KEY | OpenAI API Key | (required) |
| LLM_MODEL | OpenAI Model to use | gpt-4o-mini |

## A Note About This Project

This project was built as part of the Interview "48-hour challenge." I decided to go beyond the basic requirements and add several extra features:

- Web search capabilities
- PDF document processing
- Streaming responses for a typing effect
- AI agents orchestration
- Rate limiting to protect the API

Check out the [Architecture Overview](architecture-overview.md) to see all the improvements I made to the basic assignment!
