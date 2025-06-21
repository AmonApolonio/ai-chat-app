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
// API key validation service
import { ApiKeyValidatorService } from './api-key-validator.service';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);  
  private readonly uploadDir = path.resolve(process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads'));
  private sessionDocuments: Map<string, MemoryVectorStore> = new Map();
    constructor(
    private apiKeyValidator: ApiKeyValidatorService
  ) {
    this.ensureUploadDirExists();
    this.logger.log(`API Key: ${this.apiKeyValidator.getApiKey() ? 'Set' : 'NOT SET'}`);
    
    if (!this.apiKeyValidator.isValid()) {
      this.logger.warn('LLM_API_KEY is not set or has an invalid format. PDF processing functionality will not work properly.');
    }
  }
  
  private async ensureUploadDirExists(): Promise<void> {
    try {
      this.logger.log(`Ensuring upload directory exists at: ${this.uploadDir}`);
      await fs.mkdir(this.uploadDir, { recursive: true });
      // Check if directory is writable
      const testFile = path.join(this.uploadDir, '.write-test');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
      this.logger.log('Upload directory is writable');
    } catch (error) {
      this.logger.error(`Error with upload directory: ${error.message}`);
      this.logger.error(`Error stack: ${error.stack}`);
    }
  }
  async processFile(file: Express.Multer.File, sessionId: string): Promise<{success: boolean; error?: string}> {
    try {
      // Validate file exists
      if (!file || !file.path) {
        this.logger.error('Invalid file: File or file path is undefined');
        return { success: false, error: 'Invalid file: File or file path is undefined' };
      }
      
      this.logger.log(`Processing PDF file: ${file.originalname}, stored at: ${file.path}`);
      this.logger.log(`Upload directory is: ${this.uploadDir}`);
      this.logger.log(`File details: ${JSON.stringify({
        filename: file.filename,
        originalname: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        destination: file.destination
      })}`);
      
      // Check if file exists before reading      
      try {
        await fs.access(file.path);
        this.logger.log(`Confirmed file exists at path: ${file.path}`);
      } catch (error) {
        this.logger.error(`File does not exist at path: ${file.path}`);
        this.logger.error(`File access error: ${error.message}`);
        return { success: false, error: `File does not exist or cannot be accessed: ${error.message}` };
      }
      
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

      const isValid = await this.apiKeyValidator.validateApiKey();      if (!isValid) {
          this.logger.error('Cannot process PDF: API key validation failed');
          return { success: false, error: 'API key validation failed. Please check your API key configuration.' };
        }

      // Create embeddings and store in vector database
      const embeddings = new OpenAIEmbeddings({
        openAIApiKey: this.apiKeyValidator.getApiKey()
      });
      
      // Store in memory vector store (simpler than HNSW)
      const vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings);      // Save to session map
      this.sessionDocuments.set(sessionId, vectorStore);
      
      return { success: true };
    } catch (error) {
      this.logger.error(`Error processing PDF: ${error.message}`);
      this.logger.error(`Error stack: ${error.stack}`);
      console.error('PDF Processing Error:', error);
      return { success: false, error: `Error processing PDF: ${error.message}` };    }
  }
  
  async searchSimilarDocuments(sessionId: string, query: string): Promise<string> {
    try {
      if (!this.apiKeyValidator.isValid()) {
        const isValid = await this.apiKeyValidator.validateApiKey();
        if (!isValid) {
          return "API key is invalid or was rejected. Please configure a valid API key to use PDF functionality.";
        }
      }
      
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
