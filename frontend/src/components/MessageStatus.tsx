import React from 'react';

interface MessageStatusProps {
  isResearching: boolean;
  isLoading: boolean;
  currentStreamingMessage: string;
  isFormatting?: boolean;
}

const MessageStatus: React.FC<MessageStatusProps> = ({ isResearching, isLoading, currentStreamingMessage, isFormatting }) => {
  // Don't render anything if none of these conditions are met
  if (!isResearching && !(isLoading && !currentStreamingMessage) && !isFormatting) {
    return null;
  }
  if (isResearching) {
    return (
      <div className="flex justify-start">
        <div className="bg-white text-gray-800 border border-gray-200 shadow-sm rounded-2xl rounded-bl-none max-w-[90%] px-4 py-3">
          <div className="flex items-center gap-2 text-left">
            <span className="font-medium text-gray-700">Researching in the Web</span>
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
  if (isFormatting) {
    return (
      <div className="flex justify-start">
        <div className="bg-white text-gray-800 border border-gray-200 shadow-sm rounded-2xl rounded-bl-none max-w-[90%] px-4 py-3">
          <div className="flex items-center gap-2 text-left">
            <span className="font-medium text-gray-700">Polishing</span>
            <div className="flex gap-1">
              <span className="animate-bounce h-1.5 w-1.5 bg-blue-500 rounded-full" style={{ animationDelay: '0ms' }}></span>
              <span className="animate-bounce h-1.5 w-1.5 bg-blue-500 rounded-full" style={{ animationDelay: '300ms' }}></span>
              <span className="animate-bounce h-1.5 w-1.5 bg-blue-500 rounded-full" style={{ animationDelay: '600ms' }}></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading && !currentStreamingMessage) {
    return (
      <div className="flex justify-start">
        <div className="bg-white text-gray-800 border border-gray-200 shadow-sm rounded-2xl rounded-bl-none max-w-[90%] px-4 py-3">
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
