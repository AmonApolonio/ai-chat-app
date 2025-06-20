import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faFilePdf, faFileUpload, faTimes } from '@fortawesome/free-solid-svg-icons';
import { ChatMode } from '../types/chat';

interface ChatToolbarProps {
  chatMode: ChatMode;
  setChatMode: () => void; // Changed to function with no parameters since we toggle inside ChatBox
  pdfFile: File | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleUploadClick: () => void;
  handleRemovePdf: () => void;
  handleClearChat: () => void;
  handleFileSelect?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isDisabled: boolean;
}

const ChatToolbar: React.FC<ChatToolbarProps> = ({ 
  chatMode, 
  setChatMode,
  pdfFile,
  fileInputRef,
  handleUploadClick,
  handleRemovePdf,
  handleClearChat,
  handleFileSelect,
  isDisabled
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
      {/* Left side: Mode toggle */}
      <div className="flex items-center gap-3">
        {/* Modern toggle buttons */}
        <div className="flex items-center p-1 bg-gray-100 rounded-lg shadow-sm">          <button 
            type="button"
            onClick={setChatMode}
            disabled={isDisabled || chatMode === ChatMode.RESEARCH}
            className={`text-xs font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all duration-200 ${
              chatMode === ChatMode.RESEARCH 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FontAwesomeIcon icon={faSearch} />
            Research
          </button>
          
          <button 
            type="button"
            onClick={setChatMode}
            disabled={isDisabled || chatMode === ChatMode.PDF}
            className={`text-xs font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all duration-200 ${
              chatMode === ChatMode.PDF 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FontAwesomeIcon icon={faFilePdf} />
            PDF
          </button>
        </div>
        
        {/* PDF Upload button (only visible in PDF mode) */}
        {chatMode === ChatMode.PDF && (
          <>
            <div className="h-4 w-px bg-gray-300 mx-1"></div>
            <div className="flex items-center">              <input 
                type="file" 
                accept=".pdf" 
                onChange={handleFileSelect}
                className="hidden" 
                ref={fileInputRef}
              />
              
              {pdfFile ? (
                <div className="flex items-center gap-2 bg-gray-50 px-2 py-1.5 rounded-md text-xs shadow-sm border border-gray-100">
                  <FontAwesomeIcon icon={faFilePdf} className="text-red-500" />
                  <span className="max-w-[100px] truncate text-gray-700">{pdfFile.name}</span>
                  <button 
                    type="button" 
                    className="text-gray-400 hover:text-red-500"
                    onClick={handleRemovePdf}
                    disabled={isDisabled}
                  >
                    <FontAwesomeIcon icon={faTimes} size="xs" />
                  </button>
                </div>
              ) : (
                <button 
                  type="button" 
                  className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
                  onClick={handleUploadClick}
                  disabled={isDisabled}
                >
                  <FontAwesomeIcon icon={faFileUpload} />
                  Upload PDF
                </button>
              )}
            </div>
          </>
        )}
      </div>
      
      {/* Right side: Clear chat button */}
      <button 
        className="text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-2 py-1 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleClearChat}
        disabled={isDisabled}
      >
        <FontAwesomeIcon icon={faTimes} className="mr-1.5" />
        Clear chat
      </button>
    </div>
  );
};

export default ChatToolbar;
