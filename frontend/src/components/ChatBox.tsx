import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ChatRequest, ChatResponse } from '../types/chat';
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
  const messageContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to newest message
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Function to generate unique ID for messages
  const generateId = (): string => {
    return Math.random().toString(36).substring(2, 11);
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

    try {      const response = await fetch('http://localhost:3000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: userMessage.text,
          sessionId: sessionId 
        } as ChatRequest),
      });if (!response.ok) {
        if (response.status === 400) {
          throw new Error('Message cannot be empty.');
        } else if (response.status === 429) {
          throw new Error('You reached your rate limit, await a minute before sending more messages.');
        } else {
          throw new Error('Connection lost, please retry.');
        }
      }

      const data = await response.json() as ChatResponse;
      
      // Add bot response to chat
      const botMessage: ChatMessage = {
        id: generateId(),
        text: data.reply,
        isUser: false,
      };

      setMessages(prevMessages => [...prevMessages, botMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-box">
      <div className="message-container" ref={messageContainerRef}>        {messages.map((message) => (
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
        {isLoading && (
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
