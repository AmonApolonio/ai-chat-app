import { Injectable, Logger } from '@nestjs/common';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import * as fs from 'fs/promises';
import * as path from 'path';
import { OpenAIEmbeddings } from '@langchain/openai';
import { ConfigService } from '@nestjs/config';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
// We'll use a simpler vector store for compatibility
import { Document } from 'langchain/document';
// PDF parsing
const pdfParse = require('pdf-parse');
// For synchronous file operations
import * as fsSync from 'fs';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private readonly apiKey: string;
  private readonly uploadDir = path.join(process.cwd(), 'uploads');
  private sessionDocuments: Map<string, MemoryVectorStore> = new Map();

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('LLM_API_KEY');
    this.ensureUploadDirExists();
  }

  private async ensureUploadDirExists(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      this.logger.error(`Error creating upload directory: ${error.message}`);
    }
  }
  
  async processFile(file: Express.Multer.File, sessionId: string): Promise<boolean> {
    try {
      // Validate file exists
      if (!file || !file.path) {
        this.logger.error('Invalid file: File or file path is undefined');
        return false;
      }
      
      this.logger.log(`Processing PDF file: ${file.originalname}, stored at: ${file.path}`);
      
      // File is already on disk, so read it directly
      const dataBuffer = await fs.readFile(file.path);
      this.logger.log(`File read successfully, size: ${dataBuffer.length} bytes`);
      
      // Parse the PDF
      const pdfData = await pdfParse(dataBuffer);
      this.logger.log(`PDF parsed successfully, text length: ${pdfData.text.length} chars`);
      const text = pdfData.text;      // Split the text into chunks with more overlap for better context
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1500,       // Larger chunk size
        chunkOverlap: 500,     // More overlap between chunks
        separators: ["\n\n", "\n", " ", ""], // Custom separators to preserve context
      });
      
      this.logger.log(`Splitting PDF text into chunks for better search`);
      const docs = await textSplitter.createDocuments([text]);
      this.logger.log(`Created ${docs.length} document chunks from PDF`);
      
      // Print sample of first document for debugging
      if (docs.length > 0) {
        const sampleContent = docs[0].pageContent.substring(0, 200) + "...";
        this.logger.log(`Sample document chunk: ${sampleContent}`);
      }
        // Create embeddings and store in vector database
      const embeddings = new OpenAIEmbeddings({
        openAIApiKey: this.apiKey
      });
      
      // Store in memory vector store (simpler than HNSW)
      const vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings);
        // Save to session map
      this.sessionDocuments.set(sessionId, vectorStore);
      
      return true;
    } catch (error) {
      this.logger.error(`Error processing PDF: ${error.message}`);
      this.logger.error(`Error stack: ${error.stack}`);
      console.error('PDF Processing Error:', error);
      return false;
    }
  }
  async searchSimilarDocuments(sessionId: string, query: string): Promise<string> {
    try {
      const vectorStore = this.sessionDocuments.get(sessionId);
      if (!vectorStore) {
        return "No PDF has been uploaded for this session. Please upload a PDF first.";
      }

      this.logger.log(`Searching for query: "${query}" in PDF for session: ${sessionId}`);
      
      // Return a sample of the document as context for general queries about the PDF
      if (query.toLowerCase().includes("about the pdf") || 
          query.toLowerCase().includes("what's in this document") ||
          query.toLowerCase().includes("tell me about this document") ||
          query.toLowerCase().includes("what is this pdf about")) {
        
        // Get the first and last few document chunks to provide an overview
        const allDocs = await vectorStore.similaritySearch("", 100);
        
        if (allDocs.length > 0) {
          // Get start, middle, and end samples
          const startSample = allDocs.slice(0, 2).map(doc => doc.pageContent).join("\n\n");
          const middleSample = allDocs.slice(Math.floor(allDocs.length / 2), Math.floor(allDocs.length / 2) + 2)
                                    .map(doc => doc.pageContent).join("\n\n");
          const endSample = allDocs.slice(-2).map(doc => doc.pageContent).join("\n\n");
          
          return `Here's an overview of the PDF content:\n\n` +
                 `From the beginning:\n${startSample}\n\n` +
                 `From the middle:\n${middleSample}\n\n` +
                 `From the end:\n${endSample}`;
        }
      }

      // Increase the number of results for better context and use a more generous filter
      const results = await vectorStore.similaritySearch(query, 8);
      
      this.logger.log(`Found ${results.length} relevant chunks for query: "${query}"`);
      
      if (!results.length) {
        return "I couldn't find relevant information in the provided PDF. Please try a different question.";
      }
      
      // Format the context from the results
      const context = results.map(doc => doc.pageContent).join('\n\n');
      return context;
    } catch (error) {
      this.logger.error(`Error searching PDF content: ${error.message}`);
      return "Error searching the PDF content. Please try again.";
    }
  }

  hasPdfForSession(sessionId: string): boolean {
    return this.sessionDocuments.has(sessionId);
  }

  async cleanupSessionFiles(sessionId?: string): Promise<boolean> {
    try {
      this.logger.log(`Cleaning up PDF files${sessionId ? ` for session: ${sessionId}` : ' for all sessions'}`);
      
      // If a specific session is provided, remove only files for that session
      if (sessionId) {
        const files = await fs.readdir(this.uploadDir);
        
        for (const file of files) {
          // Only remove files that match this session's prefix
          if (file.startsWith(sessionId)) {
            await fs.unlink(path.join(this.uploadDir, file));
            this.logger.log(`Removed file: ${file}`);
          }
        }
        
        // Remove the session from our map
        this.sessionDocuments.delete(sessionId);
      } else {
        // If no session provided, clean all files in upload directory
        const files = await fs.readdir(this.uploadDir);
        
        for (const file of files) {
          await fs.unlink(path.join(this.uploadDir, file));
          this.logger.log(`Removed file: ${file}`);
        }
        
        // Clear all sessions from our map
        this.sessionDocuments.clear();
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Error cleaning up PDF files: ${error.message}`);
      return false;
    }
  }
}
