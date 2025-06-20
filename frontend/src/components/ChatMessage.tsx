import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage as ChatMessageType } from '../types/chat';

interface ChatMessageProps {
  message: ChatMessageType;
}

// CSS for the formatting animation
const formattingAnimationStyle = `
@keyframes wave {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes pulse-border {
  0%, 100% { border-color: rgba(59, 130, 246, 0.3); }
  50% { border-color: rgba(59, 130, 246, 0.8); }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

.formatting-container {
  position: relative;
  background: linear-gradient(270deg, 
    rgba(255,255,255,1) 0%, 
    rgba(240,249,255,1) 25%, 
    rgba(230,244,255,1) 50%, 
    rgba(240,249,255,1) 75%,
    rgba(255,255,255,1) 100%);
  background-size: 400% 400%;
  animation: wave 3s ease-in-out infinite;
  border: 2px solid rgba(59, 130, 246, 0.3);
  animation: wave 3s ease-in-out infinite, pulse-border 2s infinite ease-in-out;
}

.formatting-status {
  position: absolute;
  top: -10px;
  right: 10px;
  font-size: 0.75rem;
  background: #3b82f6;
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  animation: float 2s ease-in-out infinite;
  z-index: 5;
}
`;

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  // Track how long the message has been in formatting state
  const [formattingSeconds, setFormattingSeconds] = useState(0);

  // Timer for formatting state
  useEffect(() => {
    if (message.isBeingFormatted) {
      const timer = setInterval(() => {
        setFormattingSeconds(prev => prev + 1);
      }, 1000);

      return () => clearInterval(timer);
    } else {
      setFormattingSeconds(0);
    }
  }, [message.isBeingFormatted]);

  // Dynamic formatting message based on time elapsed
  const getFormattingMessage = () => {
    if (formattingSeconds < 4) {
      return "Enhancing format...";
    } else if (formattingSeconds < 6) {
      return "Polishing text...";
    } else {
      return "Finalizing formatting...";
    }
  };

  return (
    <>
      {/* Add the CSS styles for the animation */}
      <style>{formattingAnimationStyle}</style>

      <div className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`max-w-[90%] rounded-2xl px-4 py-3 break-words relative ${message.isUser
            ? 'bg-blue-600 text-white rounded-br-none'
            : 'bg-white text-gray-800 border border-gray-200 shadow-sm rounded-bl-none'
            }`}
        >          {message.isUser ? (
          <div className="text-right">{message.text}</div>
        ) : (
          <div className={`prose prose-sm max-w-none text-left prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline ${message.isBeingFormatted ? 'formatting-container' : ''}`}>
            {/* Show formatting status for AI messages */}
            {message.isBeingFormatted && (
              <div className="formatting-status">
                {getFormattingMessage()}
              </div>
            )}
            <ReactMarkdown>{message.text}</ReactMarkdown>
          </div>
        )}
        </div>
      </div>
    </>
  );
};

export default ChatMessage;
