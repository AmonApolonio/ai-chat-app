import { useState, useEffect, useRef } from 'react';
import { ChatMessage, ChatRequest, ChatStreamChunk, ChatMode, FileUploadResponse } from '../../types/chat';

interface UseChatProps {
  initialMode?: ChatMode;
  onModeChange?: (mode: ChatMode) => void;
}

export const useChat = ({ initialMode, onModeChange }: UseChatProps) => {
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
  const [isFormatting, setIsFormatting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>(`session-${Date.now()}`);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState<string>('');
  const messageContainerRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Chat mode state
  const [chatMode, setChatMode] = useState<ChatMode>(initialMode || ChatMode.RESEARCH);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isPdfUploaded, setIsPdfUploaded] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  
  // Counter to track drag enter/leave events
  const dragCounter = useRef<number>(0);

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

  // Sync mode from props when it changes externally
  useEffect(() => {
    if (initialMode !== undefined && initialMode !== chatMode) {
      setChatMode(initialMode);
    }
  }, [initialMode, chatMode]);

  // Function to generate unique ID for messages
  const generateId = (): string => {
    return Math.random().toString(36).substring(2, 11);
  };

  // Handle mode toggle
  const handleModeToggle = () => {
    const newMode = chatMode === ChatMode.RESEARCH ? ChatMode.PDF : ChatMode.RESEARCH;
    setChatMode(newMode);
    
    // Notify parent component about mode change
    if (onModeChange) {
      onModeChange(newMode);
    }
    
    // Check if the last message is about mode switching
    const lastMessage = messages[messages.length - 1];
    const isPdfModeMessage = lastMessage?.text === 'You\'ve switched to PDF mode. Please upload a PDF file to ask questions about it.';
    const isResearchModeMessage = lastMessage?.text === 'You\'ve switched to Research mode. Ask me about any company and I\'ll search the web for information.';
    
    if (newMode === ChatMode.PDF && !pdfFile) {
      if (isResearchModeMessage) {
        // Update the existing mode message instead of adding a new one
        setMessages(prevMessages => [
          ...prevMessages.slice(0, -1),
          {
            id: lastMessage.id,
            text: 'You\'ve switched to PDF mode. Please upload a PDF file to ask questions about it.',
            isUser: false
          }
        ]);
      } else {
        // Add a new message if the last message isn't about mode switching
        setMessages(prevMessages => [
          ...prevMessages,
          {
            id: generateId(),
            text: 'You\'ve switched to PDF mode. Please upload a PDF file to ask questions about it.',
            isUser: false
          }
        ]);
      }
    } else if (newMode === ChatMode.RESEARCH) {
      if (isPdfModeMessage) {
        // Update the existing mode message instead of adding a new one
        setMessages(prevMessages => [
          ...prevMessages.slice(0, -1),
          {
            id: lastMessage.id,
            text: 'You\'ve switched to Research mode. Ask me about any company and I\'ll search the web for information.',
            isUser: false
          }
        ]);
      } else {
        // Add a new message if the last message isn't about mode switching
        setMessages(prevMessages => [
          ...prevMessages,
          {
            id: generateId(),
            text: 'You\'ve switched to Research mode. Ask me about any company and I\'ll search the web for information.',
            isUser: false
          }
        ]);
      }
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
      
      // Switch to PDF mode if not already in it
      if (chatMode !== ChatMode.PDF) {
        setChatMode(ChatMode.PDF);
        
        // Notify parent component about mode change
        if (onModeChange) {
          onModeChange(ChatMode.PDF);
        }
        
        // Add message about switching to PDF mode
        setMessages(prevMessages => [
          ...prevMessages,
          {
            id: generateId(),
            text: 'Switching to PDF mode and processing your document...',
            isUser: false
          }
        ]);
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
                  setIsStreaming(true);                } else if (data.status === 'streaming-complete') {
                  setIsResearching(false);
                  setIsStreaming(false);
                  setIsFormatting(true);
                  // Add message with isBeingFormatted flag
                  setMessages(prevMessages => [
                    ...prevMessages.filter(m => m.id !== 'typing-indicator'),
                    {
                      id: messageId,
                      text: accumulatedText,
                      isUser: false,
                      isBeingFormatted: true
                    }
                  ]);
                  setCurrentStreamingMessage('');
                } else if (data.status === 'formatted-complete') {
                  // Update the existing message with formatted content
                  setMessages(prevMessages => 
                    prevMessages.map(msg => 
                      msg.id === messageId ? {
                        ...msg,
                        text: data.chunk || msg.text,
                        isBeingFormatted: false
                      } : msg
                    )
                  );
                  setIsFormatting(false);
                  setIsStreaming(false);
                  setIsResearching(false);
                  messageFinalized = true;
                }
              }
              
              // Add the new chunk to accumulated text if it exists
              if (data.chunk && data.status !== 'formatted-complete') {
                // eslint-disable-next-line no-loop-func
                const newText = accumulatedText + data.chunk;
                accumulatedText = newText;
                setCurrentStreamingMessage(newText);
              }
              
              // If done signal received without special status, complete the message
              if (data.done && !data.status) {
                // eslint-disable-next-line no-loop-func
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

  // Clear the chat history and reset the session
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
      setIsFormatting(false);
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

  // Drag and drop event handlers
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    // Increment counter when drag enters
    dragCounter.current += 1;
    // Only set dragging true if the dragged item is a file
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    // Decrement counter when drag leaves
    dragCounter.current -= 1;
    // Only turn off dragging state when counter reaches 0
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Prevent default to allow drop
  };

  return {
    // State
    messages,
    inputValue,
    setInputValue,    
    isLoading,
    isStreaming,
    isResearching,
    isFormatting,
    error,
    currentStreamingMessage,
    messageContainerRef,
    fileInputRef,
    chatMode,
    pdfFile,
    isPdfUploaded,
    isDragging,
    dragCounter,
    
    // Methods
    handleModeToggle,
    handleFileSelect,
    handleDrop,
    handleRemovePdf,
    handleUploadClick,
    handleStreamedResponse,
    handleStopStream,
    handleSubmit,
    handleClearChat,
    handleDragEnter,
    handleDragLeave,
    handleDragOver
  };
};
