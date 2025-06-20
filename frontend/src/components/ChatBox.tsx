import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ChatRequest, ChatStreamChunk } from '../types/chat';
import ReactMarkdown from 'react-markdown';
import '../styles/ChatBox.css';

const ChatBox: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-message',
      text: 'Hello! I am your company research assistant with AI agent capabilities. I can search the web for the most up-to-date information about companies. Which company would you like me to research today?',
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

  // Auto-scroll to newest message
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages, currentStreamingMessage, isResearching]);

  // Function to generate unique ID for messages
  const generateId = (): string => {
    return Math.random().toString(36).substring(2, 11);
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
      try {
      // Process chunks as they arrive
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Final update to the messages state with the complete response
          if (accumulatedText) {
            // eslint-disable-next-line no-loop-func
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
        
        for (const line of eventLines) {          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.substring(6);
              const data = JSON.parse(jsonStr) as ChatStreamChunk;
                // Handle status updates
              if (data.status) {
                if (data.status === 'researching') {
                  setIsResearching(true);
                  setIsStreaming(false);
                  // Don't continue if we have a chunk to process
                  if (!data.chunk) continue;
                } else if (data.status === 'streaming') {
                  setIsResearching(false);
                  setIsStreaming(true);
                  // Don't continue if we have a chunk to process
                  if (!data.chunk) continue;
                }
              }
                // Add the new chunk to accumulated text if it exists
              if (data.chunk) {
                const newText = accumulatedText + data.chunk;
                accumulatedText = newText;
                
                // Force React to update by creating a new string reference
                // This ensures the UI updates with each token
                // eslint-disable-next-line no-loop-func
                setCurrentStreamingMessage(prevText => prevText + data.chunk);
              }
                // If done signal received, complete the message
              if (data.done) {
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
                return;
              }
            } catch (e) {
              console.error('Error parsing stream chunk:', e);
            }
          }
        }
      }    } catch (error) {
      console.error('Error reading stream:', error);
      // Check if this was an abort error
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
        sessionId: sessionId
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
    } catch (err) {      // Check if this was an abort error
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
              <span className="researching-text">Researching...</span>
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
          placeholder="Type a company name to research..."
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
            disabled={isLoading || !inputValue.trim()} 
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
