# Architecture Overview

This document explains how the Chat App works under the hood, including its AI design and main components. I've made several improvements beyond the basic requirements in the original assignment, adding features like PDF processing, web search, and a multi-agent approach. For detailed information about each agent's implementation and responsibilities, please refer to the [Agent Details](./agent-details.md) document.

## System Architecture

The Chat App has two main parts that work together:

1. **React Frontend**: The user interface you see in your browser.
   - Shows messages in real-time as they're being typed
   - Lets you switch between research mode and PDF mode
   - Makes it easy to upload PDFs by dragging and dropping
   - Built with TypeScript to avoid bugs

2. **NestJS Backend**: The server that does all the heavy lifting.
   - Handles chat messages and responds appropriately
   - Limits how many requests you can make per minute to prevent overuse
   - Streams responses back to you bit by bit instead of all at once
   - Takes care of file uploads and processing

3. **LangChain Integration**: The AI brains of the application.
   - Works with OpenAI to provide smart responses
   - Lets the app search the web for information
   - Turns PDFs into searchable content
   - Sends back responses piece by piece for a typing effect

## Multi-Agent AI Design

The app works like a team of specialists, each handling a different job:

### Research Agent [↗ details](./agent-details.md#research-agent)
- Searches the web for company and business information
- Uses DuckDuckGo to find the most recent information
- Cleans up search results to show you only what matters

### Response Generation Agent [↗ details](./agent-details.md#generation-agent)
- Takes research results and creates helpful answers
- Remembers what you talked about before
- Focuses only on business topics (won't answer other questions)

### Formatting Agent [↗ details](./agent-details.md#formatting-agent)
- Makes responses look nice with proper formatting
- Creates headings and bullet points to organize information
- Makes everything readable on your screen

### PDF Processing Agent [↗ details](./agent-details.md#pdf-loader-agent)
- Handles your uploaded PDF files
- Pulls out all the text from documents
- Creates a special searchable version of your document
- Uses AI to understand what the document means

### Chat Interface Agent [↗ details](./agent-details.md#chat-agent)
- Manages your conversation in both research and PDF modes
- Works with all the other agents to get you answers
- Shows responses letter by letter for a typing effect

## How Information Flows

1. **When You Ask a Question**:
   - You type a message and hit send
   - Your question goes to the server
   - The right agent handles your question
   - You see the answer appear letter by letter

2. **When You Upload a PDF**:
   - You drag and drop a PDF file
   - The server saves and processes it
   - The text gets broken into manageable pieces
   - The app creates a searchable version
   - You can ask questions about the document

## What Makes It Work

- **Frontend**: React, TypeScript, and Tailwind CSS for a nice interface
- **Backend**: NestJS and TypeScript for a reliable server
- **AI Parts**: LangChain and OpenAI for smart responses
- **PDF Handling**: Tools to read and understand PDFs
- **Running It All**: Docker and Nginx to make deployment easy
