import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

interface MessageStatusProps {
  isResearching: boolean;
  isLoading: boolean;
  currentStreamingMessage: string;
}

const MessageStatus: React.FC<MessageStatusProps> = ({ isResearching, isLoading, currentStreamingMessage }) => {
  // Don't render anything if none of these conditions are met
  if (!isResearching && !(isLoading && !currentStreamingMessage)) {
    return null;
  }    
  if (isResearching) {
    return (
      <div className="flex justify-start">
        <div className="bg-white text-gray-800 border border-gray-200 shadow-sm rounded-2xl rounded-bl-none max-w-[80%] px-4 py-3">
          <div className="flex items-center gap-2 text-left">
            <span className="font-medium text-gray-700">Researching</span>
            <div className="flex gap-1">
              <span className="animate-bounce h-1.5 w-1.5 bg-blue-600 rounded-full" style={{ animationDelay: '0ms' }}></span>
              <span className="animate-bounce h-1.5 w-1.5 bg-blue-600 rounded-full" style={{ animationDelay: '300ms' }}></span>
              <span className="animate-bounce h-1.5 w-1.5 bg-blue-600 rounded-full" style={{ animationDelay: '600ms' }}></span>
            </div>
          </div>
        </div>
      </div>
    );
  }    
  if (isLoading && !currentStreamingMessage) {
    return (
      <div className="flex justify-start">
        <div className="bg-white text-gray-800 border border-gray-200 shadow-sm rounded-2xl rounded-bl-none max-w-[80%] px-4 py-3">
          <div className="flex items-center gap-2 text-left">
            <span className="font-medium text-gray-700">Processing</span>
            <div className="flex gap-1">
              <span className="animate-bounce h-1.5 w-1.5 bg-gray-500 rounded-full" style={{ animationDelay: '0ms' }}></span>
              <span className="animate-bounce h-1.5 w-1.5 bg-gray-500 rounded-full" style={{ animationDelay: '300ms' }}></span>
              <span className="animate-bounce h-1.5 w-1.5 bg-gray-500 rounded-full" style={{ animationDelay: '600ms' }}></span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return null;
};

export default MessageStatus;
