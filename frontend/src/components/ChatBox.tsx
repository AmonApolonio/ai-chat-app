import React, { useState, useEffect, useRef } from 'react';
import '../styles/ChatBox.css';
import '../styles/ModeToggle.css';
import ReactMarkdown from 'react-markdown';
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
  const [sessionId] = useState<string>(`session-${Date.now()}`);
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
  };

  return (
    <div className="chat-box">
      {/* Mode Toggle Switch */}
      <div className="mode-toggle-container">
        <span className={`mode-toggle-label ${chatMode === ChatMode.RESEARCH ? 'active' : ''}`}>
          Research Mode
        </span>
        <label className="mode-toggle">
          <input 
            type="checkbox" 
            checked={chatMode === ChatMode.PDF}
            onChange={handleModeToggle}
            disabled={isStreaming || isResearching || isLoading}
          />
          <span className="slider"></span>
        </label>
        <span className={`mode-toggle-label ${chatMode === ChatMode.PDF ? 'active' : ''}`}>
          PDF Mode
        </span>
      </div>
      
      {/* PDF Upload Section (only visible in PDF mode) */}
      {chatMode === ChatMode.PDF && (
        <div 
          className={`pdf-upload-container ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input 
            type="file" 
            accept=".pdf" 
            onChange={handleFileSelect} 
            className="pdf-input" 
            ref={fileInputRef}
          />
          
          {pdfFile ? (
            <div className="pdf-file-info">
              <span className="pdf-file-name">{pdfFile.name}</span>
              <button 
                type="button" 
                className="pdf-file-remove" 
                onClick={handleRemovePdf}
                disabled={isStreaming || isResearching || isLoading}
              >
                ×
              </button>
            </div>
          ) : (
            <>
              <button 
                type="button" 
                className="pdf-upload-btn" 
                onClick={handleUploadClick}
                disabled={isStreaming || isResearching || isLoading}
              >
                Upload PDF
              </button>
              <p className="pdf-upload-text">or drag and drop your PDF file here</p>
            </>
          )}
        </div>
      )}
      
      <div className="message-container" ref={messageContainerRef}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.isUser ? 'user-message' : 'bot-message'}`}
          >
            <div className="message-bubble">
              {message.isUser ? (
                message.text
              ) : (
                <ReactMarkdown>{message.text}</ReactMarkdown>
              )}
            </div>
          </div>
        ))}
        
        {/* Show researching indicator */}
        {isResearching && (
          <div className="message bot-message">
            <div className="message-bubble researching">
              <div className="researching-text">Researching</div>
              <div className="research-dots">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            </div>
          </div>
        )}
        
        {/* Show streaming message as it comes in */}
        {currentStreamingMessage && (
          <div className="message bot-message">
            <div className="message-bubble">
              <ReactMarkdown>{currentStreamingMessage}</ReactMarkdown>
            </div>
          </div>
        )}
        
        {/* Show loading indicator only when not streaming or researching */}
        {isLoading && !currentStreamingMessage && !isResearching && (
          <div className="message bot-message">
            <div className="message-bubble typing">Typing...</div>
          </div>
        )}
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit} className="input-form">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={chatMode === ChatMode.RESEARCH 
            ? "Type a company name to research..." 
            : "Ask a question about the uploaded PDF..."}
          className="message-input"
          autoFocus
          disabled={isStreaming || isResearching}
        />
        {isStreaming || isResearching ? (
          <button 
            type="button" 
            onClick={handleStopStream} 
            className="send-button stop-button"
          >
            Stop
          </button>
        ) : (
          <button 
            type="submit" 
            disabled={isLoading || !inputValue.trim() || (chatMode === ChatMode.PDF && !isPdfUploaded)} 
            className="send-button"
          >
            Send
          </button>
        )}
      </form>
    </div>
  );
};

export default ChatBox;
