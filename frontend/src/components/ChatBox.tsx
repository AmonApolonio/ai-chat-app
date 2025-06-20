import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faSpinner, faTimes, faFileUpload, faSearch, faFilePdf } from '@fortawesome/free-solid-svg-icons';
import { ChatMessage, ChatRequest, ChatStreamChunk, ChatMode, FileUploadResponse } from '../types/chat';

const ChatBox: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-message',
      text: 'Hello! I am your AI assistant with two modes:\n\n- **Research Mode**: I can search the web for company information\n\n- **PDF Mode**: Upload a PDF to ask questions about its content',
      isUser: false,
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>(`session-${Date.now()}`);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState<string>('');
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Chat mode state
  const [chatMode, setChatMode] = useState<ChatMode>(ChatMode.RESEARCH);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isPdfUploaded, setIsPdfUploaded] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Auto-scroll to newest message
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages, currentStreamingMessage, isResearching]);
  // Cleanup PDFs when the page is unloaded (browser close, refresh)
  useEffect(() => {
    const cleanupBeforeUnload = async () => {
      try {
        // Always clean up ALL files on page unload
        navigator.sendBeacon('http://localhost:3000/chat/cleanup-all-pdfs');
        console.log('Cleanup request for ALL files sent on page unload');
      } catch (error) {
        console.error('Error sending cleanup request:', error);
      }
    };

    window.addEventListener('beforeunload', cleanupBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', cleanupBeforeUnload);
      // Also clean up when component unmounts - clean ALL files
      fetch('http://localhost:3000/chat/cleanup-all-pdfs', {
        method: 'POST'
      }).catch(err => console.error('Error cleaning up on unmount:', err));
    };
  }, []);

  // Function to generate unique ID for messages
  const generateId = (): string => {
    return Math.random().toString(36).substring(2, 11);
  };
  
  // Handle mode toggle
  const handleModeToggle = () => {
    const newMode = chatMode === ChatMode.RESEARCH ? ChatMode.PDF : ChatMode.RESEARCH;
    setChatMode(newMode);
    
    // Add system message when switching modes
    if (newMode === ChatMode.PDF && !pdfFile) {
      setMessages(prevMessages => [
        ...prevMessages,
        {
          id: generateId(),
          text: 'You\'ve switched to PDF mode. Please upload a PDF file to ask questions about it.',
          isUser: false
        }
      ]);
    } else if (newMode === ChatMode.RESEARCH) {
      setMessages(prevMessages => [
        ...prevMessages,
        {
          id: generateId(),
          text: 'You\'ve switched to Research mode. Ask me about any company and I\'ll search the web for information.',
          isUser: false
        }
      ]);
    }
  };
  
  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const selectedFile = files[0];
      if (selectedFile.type !== 'application/pdf') {
        setError('Please select a PDF file');
        return;
      }
      
      setPdfFile(selectedFile);
      await uploadPdfFile(selectedFile);
    }
  };
  
  // Handle drop event for drag and drop
  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      const droppedFile = files[0];
      if (droppedFile.type !== 'application/pdf') {
        setError('Please drop a PDF file');
        return;
      }
      
      setPdfFile(droppedFile);
      await uploadPdfFile(droppedFile);
    }
  };
    // Upload PDF file to backend
  const uploadPdfFile = async (file: File) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Log file details for debugging
      console.log('Uploading file:', {
        name: file.name,
        type: file.type,
        size: file.size,
      });
      
      const formData = new FormData();
      // Make sure to append with the correct key - 'file' must match the backend
      formData.append('file', file);
      formData.append('sessionId', sessionId);
      
      // Debug the form data
      console.log('FormData created with file and sessionId:', sessionId);
      
      const response = await fetch('http://localhost:3000/chat/upload-pdf', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header when using FormData
        // The browser will set the correct multipart/form-data with boundary
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload file');
      }
      
      const data: FileUploadResponse = await response.json();
      
      if (data.success) {
        setIsPdfUploaded(true);
        setMessages(prevMessages => [
          ...prevMessages,
          {
            id: generateId(),
            text: `PDF "${file.name}" uploaded successfully! You can now ask questions about its content.`,
            isUser: false
          }
        ]);
      } else {
        throw new Error(data.message || 'Failed to process PDF');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred while uploading the file');
      setPdfFile(null);
    } finally {
      setIsLoading(false);
    }
  };
  // Remove the uploaded PDF
  const handleRemovePdf = async () => {
    try {
      // Clean up all PDF files, not just the current session
      const response = await fetch('http://localhost:3000/chat/cleanup-all-pdfs', {
        method: 'POST'
      });
      
      if (!response.ok) {
        console.error('Failed to cleanup PDF files');
      }
      
      // Even if cleanup fails, reset the UI state
      setPdfFile(null);
      setIsPdfUploaded(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      console.log('All PDF files cleaned up on backend');
    } catch (error) {
      console.error('Error cleaning up PDF:', error);
      // Still reset UI state even on error
      setPdfFile(null);
      setIsPdfUploaded(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // Handle clearing the entire chat
  
  // Handle clicking the upload button
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Handle drag events
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Handle streaming responses
  const handleStreamedResponse = async (response: Response) => {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body cannot be read');
    }
    
    // Generate a placeholder message ID for the streaming response
    const messageId = generateId();
    let accumulatedText = '';
    let messageFinalized = false;
    
    try {
      // Process chunks as they arrive
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Final update to the messages state with the complete response
          if (accumulatedText && !messageFinalized) {
            setMessages(prevMessages => [
              ...prevMessages.filter(m => m.id !== 'typing-indicator'),
              {
                id: messageId,
                text: accumulatedText,
                isUser: false
              }
            ]);
          }
          setCurrentStreamingMessage('');
          setIsStreaming(false);
          setIsResearching(false);
          break;
        }
        
        // Decode and process the chunk
        const chunk = new TextDecoder().decode(value);
        
        const eventLines = chunk.split('\n\n');
        
        for (const line of eventLines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.substring(6);
              const data = JSON.parse(jsonStr) as ChatStreamChunk;
              
              // Handle status updates
              if (data.status) {
                if (data.status === 'researching') {
                  setIsResearching(true);
                  setIsStreaming(false);
                } else if (data.status === 'streaming') {
                  setIsResearching(false);
                  setIsStreaming(true);
                }
              }
              
              // Add the new chunk to accumulated text if it exists
              if (data.chunk) {
                const newText = accumulatedText + data.chunk;
                accumulatedText = newText;
                setCurrentStreamingMessage(newText);
              }
              
              // If done signal received, complete the message
              if (data.done) {
                setMessages(prevMessages => [
                  ...prevMessages.filter(m => m.id !== 'typing-indicator'),
                  {
                    id: messageId,
                    text: accumulatedText,
                    isUser: false
                  }
                ]);
                setCurrentStreamingMessage('');
                setIsStreaming(false);
                setIsResearching(false);
                messageFinalized = true;
              }
            } catch (e) {
              console.error('Error parsing stream chunk:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error reading stream:', error);
      // Check if this was an abort error
      if (!messageFinalized) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          // Display user-friendly abort message
          setMessages(prevMessages => [
            ...prevMessages.filter(m => m.id !== 'typing-indicator'),
            {
              id: messageId,
              text: accumulatedText || 'Request stopped by the user',
              isUser: false
            }
          ]);
        } else {
          // Handle other errors
          setMessages(prevMessages => [
            ...prevMessages.filter(m => m.id !== 'typing-indicator'),
            {
              id: messageId,
              text: accumulatedText || 'Error reading response stream',
              isUser: false
            }
          ]);
        }
      }
      setCurrentStreamingMessage('');
      setIsStreaming(false);
      setIsResearching(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim()) {
      setError('Message cannot be empty.');
      return;
    }

    // Clear previous errors
    setError(null);

    // In PDF mode, require a PDF to be uploaded first
    if (chatMode === ChatMode.PDF && !isPdfUploaded) {
      setError('Please upload a PDF file first before asking questions.');
      return;
    }

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: generateId(),
      text: inputValue,
      isUser: true,
    };

    setMessages(prevMessages => [...prevMessages, userMessage]);
    
    // Clear input and focus it
    setInputValue('');
    
    setIsLoading(true);
    
    try {
      const requestBody: ChatRequest = { 
        message: userMessage.text,
        sessionId: sessionId,
        mode: chatMode
      };

      // Create a new AbortController for this request
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      const response = await fetch('http://localhost:3000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: signal
      });
      
      if (!response.ok) {
        if (response.status === 400) {
          throw new Error('Message cannot be empty.');
        } else if (response.status === 429) {
          throw new Error('You reached your rate limit, await a minute before sending more messages.');
        } else {
          throw new Error('Connection lost, please retry.');
        }
      }

      await handleStreamedResponse(response);
    } catch (err) {
      // Check if this was an abort error
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Add a message to indicate the stream was stopped by the user
        setMessages(prevMessages => [
          ...prevMessages,
          {
            id: generateId(),
            text: 'Request stopped by the user',
            isUser: false
          }
        ]);
        // Clear streaming state
        setCurrentStreamingMessage('');
      } else {
        // Handle other errors
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      }
      setIsLoading(false);
      setIsStreaming(false);
      setIsResearching(false);
    }
  };  // Clear the chat history and reset the session
  const handleClearChat = async () => {
    try {
      // Stop any ongoing streaming responses
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      // Clean up all PDF files on the backend
      const response = await fetch('http://localhost:3000/chat/cleanup-all-pdfs', {
        method: 'POST'
      });
      
      if (!response.ok) {
        console.error('Failed to cleanup PDF files during chat clear');
      }
      
      // Generate a new session ID
      const newSessionId = `session-${Date.now()}`;
      setSessionId(newSessionId);
      console.log('Created new session ID:', newSessionId);
      
      // Reset messages to initial state
      setMessages([
        {
          id: 'welcome-message',
          text: 'Hello! I am your AI assistant with two modes:\n\n- **Research Mode**: I can search the web for company information\n\n- **PDF Mode**: Upload a PDF to ask questions about its content',
          isUser: false,
        }
      ]);
      setInputValue('');
      setIsLoading(false);
      setIsStreaming(false);
      setIsResearching(false);
      setError(null);
      setCurrentStreamingMessage('');
      
      // Reset PDF state
      setPdfFile(null);
      setIsPdfUploaded(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      console.log('Chat cleared successfully, all states reset');
    } catch (error) {
      console.error('Error clearing chat:', error);
      setError('Failed to clear chat. Please try again.');
    }
  };
  return (
    <div className="w-full max-w-3xl mx-auto border border-gray-200 rounded-lg overflow-hidden flex flex-col h-[600px] shadow-md">
      <div className="bg-white py-3 px-4 border-b border-gray-200 flex justify-between items-center">
        {/* Mode Toggle Switch */}
        <div className="flex items-center justify-center gap-5 bg-gray-50 p-2.5 rounded-lg">
          <span className={`text-sm font-medium ${chatMode === ChatMode.RESEARCH ? 'text-blue-500 font-semibold' : 'text-gray-600'}`}>
            <FontAwesomeIcon icon={faSearch} className="mr-2" />
            Research Mode
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={chatMode === ChatMode.PDF}
              onChange={handleModeToggle}
              disabled={isStreaming || isResearching || isLoading}
              className="sr-only peer"
            />
            <div className="w-12 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
          </label>
          <span className={`text-sm font-medium ${chatMode === ChatMode.PDF ? 'text-blue-500 font-semibold' : 'text-gray-600'}`}>
            <FontAwesomeIcon icon={faFilePdf} className="mr-2" />
            PDF Mode
          </span>
        </div>
        
        {/* Clear Chat Button */}
        <button 
          className="text-sm font-medium text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-md px-3 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleClearChat}
          disabled={isStreaming || isResearching || isLoading}
        >
          <FontAwesomeIcon icon={faTimes} className="mr-1.5" />
          Clear Chat
        </button>
      </div>
        {/* PDF Upload Section (only visible in PDF mode) */}
      {chatMode === ChatMode.PDF && (
        <div 
          className={`bg-gray-50 p-4 border-b border-gray-200 text-center ${isDragging ? 'border-2 border-dashed border-blue-400 bg-blue-50' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input 
            type="file" 
            accept=".pdf" 
            onChange={handleFileSelect} 
            className="hidden" 
            ref={fileInputRef}
          />
          
          {pdfFile ? (
            <div className="flex items-center justify-center gap-3 bg-white p-3 rounded-md shadow-sm">
              <FontAwesomeIcon icon={faFilePdf} className="text-red-500 text-lg" />
              <span className="flex-1 truncate text-gray-700">{pdfFile.name}</span>
              <button 
                type="button" 
                className="text-gray-500 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleRemovePdf}
                disabled={isStreaming || isResearching || isLoading}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          ) : (
            <>
              <button 
                type="button" 
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md inline-flex items-center gap-2 mb-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleUploadClick}
                disabled={isStreaming || isResearching || isLoading}
              >
                <FontAwesomeIcon icon={faFileUpload} />
                Upload PDF
              </button>
              <p className="text-sm text-gray-500">or drag and drop your PDF file here</p>
            </>
          )}
        </div>
      )}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4" ref={messageContainerRef}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[85%] rounded-2xl px-4 py-3 break-words ${
                message.isUser 
                  ? 'bg-blue-500 text-white rounded-br-md' 
                  : 'bg-white text-gray-800 border border-gray-200 shadow-sm rounded-bl-md'
              }`}
            >
              {message.isUser ? (
                <div>{message.text}</div>
              ) : (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{message.text}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
          {/* Show researching indicator */}
        {isResearching && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-800 border border-gray-200 shadow-sm rounded-2xl rounded-bl-md max-w-[85%] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-700">Researching</span>
                <div className="flex gap-1">
                  <span className="animate-bounce h-1.5 w-1.5 bg-blue-500 rounded-full" style={{ animationDelay: '0ms' }}></span>
                  <span className="animate-bounce h-1.5 w-1.5 bg-blue-500 rounded-full" style={{ animationDelay: '300ms' }}></span>
                  <span className="animate-bounce h-1.5 w-1.5 bg-blue-500 rounded-full" style={{ animationDelay: '600ms' }}></span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Show streaming message as it comes in */}
        {currentStreamingMessage && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-800 border border-gray-200 shadow-sm rounded-2xl rounded-bl-md max-w-[85%] px-4 py-3 break-words">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{currentStreamingMessage}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}
        
        {/* Show loading indicator only when not streaming or researching */}
        {isLoading && !currentStreamingMessage && !isResearching && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-800 border border-gray-200 shadow-sm rounded-2xl rounded-bl-md max-w-[85%] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-700">Typing</span>
                <div className="flex gap-1">
                  <span className="animate-bounce h-1.5 w-1.5 bg-gray-500 rounded-full" style={{ animationDelay: '0ms' }}></span>
                  <span className="animate-bounce h-1.5 w-1.5 bg-gray-500 rounded-full" style={{ animationDelay: '300ms' }}></span>
                  <span className="animate-bounce h-1.5 w-1.5 bg-gray-500 rounded-full" style={{ animationDelay: '600ms' }}></span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {error && <div className="bg-red-100 text-red-700 px-4 py-2 text-center text-sm">{error}</div>}
      
      <form onSubmit={handleSubmit} className="flex items-center p-3 border-t border-gray-200 bg-white">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={chatMode === ChatMode.RESEARCH 
            ? "Type a company name to research..." 
            : "Ask a question about the uploaded PDF..."}
          className="flex-1 border border-gray-300 rounded-l-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
          autoFocus
          disabled={isStreaming || isResearching}
        />
        {isStreaming || isResearching ? (
          <button 
            type="button" 
            onClick={handleStopStream} 
            className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-r-md flex items-center"
          >
            <FontAwesomeIcon icon={faTimes} className="mr-2" />
            Stop
          </button>
        ) : (
          <button 
            type="submit" 
            disabled={isLoading || !inputValue.trim() || (chatMode === ChatMode.PDF && !isPdfUploaded)} 
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-r-md flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <FontAwesomeIcon icon={faSpinner} className="mr-2 animate-spin" />
            ) : (
              <FontAwesomeIcon icon={faPaperPlane} className="mr-2" />
            )}
            Send
          </button>
        )}
      </form>
    </div>
  );
};

export default ChatBox;
