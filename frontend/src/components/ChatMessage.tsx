import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage as ChatMessageType } from '../types/chat';

interface ChatMessageProps {
  message: ChatMessageType;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  return (
    <div
      className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
    >      <div 
        className={`max-w-[90%] rounded-2xl px-4 py-3 break-words ${
          message.isUser 
            ? 'bg-blue-600 text-white rounded-br-none' 
            : 'bg-white text-gray-800 border border-gray-200 shadow-sm rounded-bl-none'
        }`}
      >        {message.isUser ? (
          <div className="text-right">{message.text}</div>
        ) : (
          <div className="prose prose-sm max-w-none text-left prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline">
            <ReactMarkdown>{message.text}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
