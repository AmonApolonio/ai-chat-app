import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faSpinner, faTimes } from '@fortawesome/free-solid-svg-icons';
import { ChatMode } from '../types/chat';

interface ChatInputProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  handleStopStream: () => void;
  isStreaming: boolean;
  isResearching: boolean;
  isLoading: boolean;
  chatMode: ChatMode;
  isPdfUploaded: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  inputValue,
  setInputValue,
  handleSubmit,
  handleStopStream,
  isStreaming,
  isResearching,
  isLoading,
  chatMode,
  isPdfUploaded
}) => {
  return (
    <form onSubmit={handleSubmit} className="flex items-center p-3">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={chatMode === ChatMode.RESEARCH 
          ? "Type a company name to research..." 
          : "Ask a question about the uploaded PDF..."}
        className="flex-1 border border-gray-300 rounded-l-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 shadow-sm"
        autoFocus
        disabled={isStreaming || isResearching || (chatMode === ChatMode.PDF && !isPdfUploaded)}
      />
      {isStreaming || isResearching ? (
        <button 
          type="button" 
          onClick={handleStopStream} 
          className="bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-5 rounded-r-lg flex items-center shadow-sm"
        >
          <FontAwesomeIcon icon={faTimes} className="mr-2" />
          Stop
        </button>
      ) : (
        <button 
          type="submit" 
          disabled={isLoading || !inputValue.trim() || (chatMode === ChatMode.PDF && !isPdfUploaded)} 
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-5 rounded-r-lg flex items-center disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {isLoading ? (
            <FontAwesomeIcon icon={faSpinner} className="mr-2 animate-spin" />
          ) : (
            <FontAwesomeIcon icon={faPaperPlane} className="mr-2" />
          )}
          Send
        </button>
      )}
    </form>
  );
};

export default ChatInput;
