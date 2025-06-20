import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ChatRequest, ChatResponse, ChatStreamChunk } from '../types/chat';
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
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState<string>(`session-${Date.now()}`);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState<string>('');
  const messageContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to newest message
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages, currentStreamingMessage]);

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
          setMessages(prevMessages => [
            ...prevMessages.filter(m => m.id !== 'typing-indicator'),
            {
              id: messageId,
              text: accumulatedText,
              isUser: false
            }
          ]);
          setCurrentStreamingMessage('');
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
              
              // Add the new chunk to accumulated text
              accumulatedText += data.chunk;
              
              // Update UI with current streaming message
              setCurrentStreamingMessage(accumulatedText);
              
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
                return;
              }
            } catch (e) {
              console.error('Error parsing stream chunk:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error reading stream:', error);
      // Handle the error and update messages accordingly
      setMessages(prevMessages => [
        ...prevMessages.filter(m => m.id !== 'typing-indicator'),
        {
          id: messageId,
          text: accumulatedText || 'Error reading response stream',
          isUser: false
        }
      ]);
      setCurrentStreamingMessage('');
    } finally {
      setIsLoading(false);
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
    
    setIsLoading(true);    try {
      const requestBody: ChatRequest = { 
        message: userMessage.text,
        sessionId: sessionId
      };

      const response = await fetch('http://localhost:3000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
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
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setIsLoading(false);
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
        {/* Show streaming message as it comes in */}
        {currentStreamingMessage && (
          <div className="message bot-message">
            <div className="message-bubble">
              <ReactMarkdown>{currentStreamingMessage}</ReactMarkdown>
            </div>
          </div>
        )}
        {/* Show loading indicator only when not streaming */}
        {isLoading && !currentStreamingMessage && (
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
        />
        <button 
          type="submit" 
          disabled={isLoading || !inputValue.trim()} 
          className="send-button"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatBox;
