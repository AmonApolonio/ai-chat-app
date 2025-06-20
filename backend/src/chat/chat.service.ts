import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { ChatRequestDto, ChatStreamChunkDto, ChatMode } from './dto/chat.dto';
import { AgentService } from './services/agent.service';
import { HumanMessage } from "@langchain/core/messages";
import { PdfService } from './services/pdf.service';

@Injectable()
export class ChatService {
  private chatHistory: Map<string, HumanMessage[]> = new Map();
  private sessionModes: Map<string, ChatMode> = new Map();

  constructor(
    private readonly agentService: AgentService,
    private readonly pdfService: PdfService
  ) { }
  async processPdf(file: Express.Multer.File, sessionId: string): Promise<boolean> {
    return await this.pdfService.processFile(file, sessionId);
  }

  async cleanupPdf(sessionId: string): Promise<boolean> {
    return await this.pdfService.cleanupSessionFiles(sessionId);
  }

  async cleanupAllPdfs(): Promise<boolean> {
    return await this.pdfService.cleanupSessionFiles();
  }

  async streamResponse(chatRequest: ChatRequestDto, response: Response, abortSignal?: AbortSignal): Promise<void> {
    // Get or create conversation history
    const sessionId = chatRequest.sessionId || 'default';
    if (!this.chatHistory.has(sessionId)) {
      this.chatHistory.set(sessionId, []);
    }

    // Save or update the chat mode for this session
    if (chatRequest.mode) {
      this.sessionModes.set(sessionId, chatRequest.mode);
    }

    const currentMode = this.sessionModes.get(sessionId) || ChatMode.RESEARCH;
    const history = this.chatHistory.get(sessionId) || [];

    // Add user message to history
    const userMessage = new HumanMessage(chatRequest.message);
    history.push(userMessage);

    // Set up abort flag
    let isAborted = false;
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        isAborted = true;
      });
    }

    try {
      // If PDF mode and we have PDF data for this session, use the PDF content
      if (currentMode === ChatMode.PDF) {
        if (!this.pdfService.hasPdfForSession(sessionId)) {
          const errorResponse = {
            chunk: "Please upload a PDF file first before asking questions in PDF mode.",
            done: true
          };
          response.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
          response.end();
          return;
        }

        // Signal researching state
        const statusUpdate = { chunk: '', done: false, status: 'researching' };
        response.write(`data: ${JSON.stringify(statusUpdate)}\n\n`);

        // Search PDF for relevant content
        const pdfContent = await this.pdfService.searchSimilarDocuments(sessionId, chatRequest.message);

        // Signal streaming state
        const streamingUpdate = { chunk: '', done: false, status: 'streaming' };
        response.write(`data: ${JSON.stringify(streamingUpdate)}\n\n`);

        // Setup system prompt for PDF chat
        const pdfSystemPrompt = `You are a helpful assistant answering questions about the content of a PDF document.
Below is the relevant content extracted from the PDF:

${pdfContent}

Answer questions based ONLY on this content. If the answer is not in the provided content, say "I don't have that information in the document." 
DO NOT make up information that is not in the provided content.
Format your answer using Markdown for better readability when appropriate.`;

        // Use agent to generate a response based on the PDF content
        await this.agentService.streamPdfResponse(
          chatRequest.message,
          pdfContent,
          (chunk: string, done: boolean, status?: 'researching' | 'streaming' | 'streaming-complete' | 'formatted-complete') => {
            if (isAborted) return;
            const chunkData: ChatStreamChunkDto = { chunk, done, status };
            const eventData = `data: ${JSON.stringify(chunkData)}\n\n`;
            response.write(eventData);
            if (done && (!status || status === 'formatted-complete')) {
              response.end();
            }
          },
          abortSignal
        );
      } else {
        // Use the regular agent for research mode
        await this.agentService.streamResponse(
          chatRequest.message,
          history,
          (chunk: string, done: boolean, status?: 'researching' | 'streaming' | 'streaming-complete' | 'formatted-complete') => {
            if (isAborted) return;
            const chunkData: ChatStreamChunkDto = { chunk, done, status };
            const eventData = `data: ${JSON.stringify(chunkData)}\n\n`;
            response.write(eventData);
            if (done && (!status || status === 'formatted-complete')) {
              response.end();
            }
          },
          abortSignal
        );
      }

      if (!isAborted) {
        this.chatHistory.set(sessionId, history);
      }
    } catch (error) {
      if (isAborted) return;
      const errorResponse = {
        chunk: `Error: ${error.message || 'An unknown error occurred'}`,
        done: true
      };
      response.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
      response.end();
    }
  }
}
