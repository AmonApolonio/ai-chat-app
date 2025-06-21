# Agent Details

This document provides detailed information about each AI agent in the Chat App system and their specific responsibilities. For a high-level understanding of how these agents work together within the system architecture, please refer to the [Architecture Overview](./architecture-overview.md) document.

## Research Agent

The Research Agent is responsible for gathering information from the web when operating in Research Mode.

### Features:

- **Web Search**: Uses DuckDuckGo to find current information about companies, industries, and business topics
- **Result Processing**: Extracts relevant content from search results, including titles, snippets, and URLs
- **Domain Filtering**: Focuses only on business-relevant information sources
- **Error Handling**: Gracefully handles failed searches or connection issues

### Implementation:

The Research Agent is implemented as a LangChain tool using Cheerio for HTML parsing:

```typescript
// Web search tool implementation (simplified)
export class WebSearchTool implements BaseTool {
  createTool(logger: ToolLogger): DynamicTool {
    return new DynamicTool({
        name: "web_search",
        description: "Search the web for information about companies, topics, or current events.",
        func: async (query: string) => {
          try {
            const response = await fetch(`https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
            
            if (!response.ok) {
              throw new Error(`Web search failed with status: ${response.status}`);
            }
            
            const html = await response.text();
            const $ = cheerio.load(html);
            
            // Extract and process search results
            // ...
          } catch (error) {
            // Error handling
          }
        }
    });
  }
}
```

## Generation Agent

The Generation Agent processes information and produces responses based on research results or PDF content.

### Features:

- **Context Management**: Maintains conversation history for coherent responses
- **Research Integration**: Incorporates web search results into responses
- **Domain Focus**: Specializes in company and business information
- **Off-Topic Detection**: Politely refuses to answer questions outside its domain

### Implementation:

The Generation Agent uses a specialized system prompt to ensure it stays focused on its domain:

```
You are a specialized corporate research assistant with expertise in analyzing companies and industries.
Your primary function is to provide insightful information about companies including:

- Company performance, financials, and stock information
- Market positioning and competitive analysis
- Recent news, mergers, acquisitions, and partnerships
- Leadership teams and corporate structure
- Industry trends and market forecasts
- Business models and revenue streams
- Product or service offerings

IMPORTANT: You MUST ONLY respond to queries about companies, industries, businesses, stocks, markets, corporate entities, or business-related topics.
```

## Formatting Agent

The Formatting Agent ensures responses are properly structured and formatted for optimal display.

### Features:

- **Markdown Formatting**: Applies consistent Markdown styling to responses
- **Structure Organization**: Creates logical sections with appropriate headings
- **List Handling**: Properly formats bullet points and numbered lists
- **Link Formatting**: Ensures URLs are presented as clickable links

### Implementation:

The Formatting Agent uses specific formatting instructions to structure responses:

```
RESPONSE FORMATTING REQUIREMENTS:
- Use proper Markdown formatting throughout your response
- Begin with a clear ### Company Name heading
- Organize content into logical sections with ### Section Headings
- For subsections use #### Subsection Headings 
- Always include blank lines before and after headings, paragraphs, lists, and code blocks
- Format lists with proper spacing (blank line before and after the list)
```

## PDF Loader Agent

The PDF Loader Agent handles document processing and creates searchable embeddings.

### Features:

- **File Upload Management**: Handles PDF file uploads and storage
- **Text Extraction**: Parses PDF content into usable text
- **Chunking**: Splits large documents into manageable chunks
- **Embedding Generation**: Creates vector embeddings for semantic search
- **Session Management**: Ties documents to user sessions for privacy

### Implementation:

```typescript
// PDF processing (simplified)
async processFile(file: Express.Multer.File, sessionId: string): Promise<{success: boolean; error?: string}> {
  try {
    // Extract text from PDF
    const buffer = await fs.readFile(file.path);
    const pdfData = await pdfParse(buffer);
    
    // Split text into chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 100,
    });
    
    const docs = await textSplitter.createDocuments([pdfData.text]);
    
    // Create vector store with embeddings
    const vectorStore = await MemoryVectorStore.fromDocuments(
      docs,
      new OpenAIEmbeddings({
        openAIApiKey: this.apiKeyValidator.getApiKey(),
      })
    );
    
    // Store for the session
    this.sessionDocuments.set(sessionId, vectorStore);
    
    return { success: true };
  } catch (error) {
    // Error handling
    return { success: false, error: error.message };
  }
}
```

## Chat Agent

The Chat Agent coordinates interactions between the user and the AI system.

### Features:

- **Mode Switching**: Handles both Research and PDF modes
- **Response Streaming**: Provides real-time streaming of responses
- **Rate Limiting**: Prevents abuse through rate limiting
- **Error Handling**: Manages and reports errors in a user-friendly way
- **Session Management**: Maintains chat context within user sessions

### Implementation:

The Chat Agent coordinates all other components:

```typescript
// Chat service implementation (simplified)
async processMessage(chatRequest: ChatRequest, onToken?: OnTokenCallback): Promise<string> {
  try {
    const { message, sessionId, mode } = chatRequest;
    
    // Handle according to mode
    if (mode === ChatMode.PDF && this.sessionDocuments.has(sessionId)) {
      // Process PDF query
      // ...
    } else {
      // Research mode - use agent with web search
      const executor = await this.getOrCreateAgent();
      const response = await this.runAgentWithStreaming(executor, message, onToken);
      return response;
    }
  } catch (error) {
    // Error handling
  }
}
```
