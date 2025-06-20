import React from 'react';
import ReactMarkdown from 'react-markdown';

interface StreamingMessageProps {
  text: string;
}

const StreamingMessage: React.FC<StreamingMessageProps> = ({ text }) => {
  if (!text) return null;
  
  return (
    <div className="flex justify-start">      
    <div className="bg-white text-gray-800 border border-gray-200 shadow-sm rounded-2xl rounded-bl-none max-w-[80%] px-4 py-3 break-words">
        <div className="prose prose-sm max-w-none text-left">
          <ReactMarkdown>{text}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default StreamingMessage;
