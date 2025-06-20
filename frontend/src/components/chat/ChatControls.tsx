import React, { MutableRefObject } from 'react';
import { ChatMode } from '../../types/chat';
import ChatToolbar from '../ChatToolbar';
import ChatInput from '../ChatInput';

interface ChatControlsProps {
  error: string | null;
  chatMode: ChatMode;
  pdfFile: File | null;
  fileInputRef: MutableRefObject<HTMLInputElement | null>;
  handleModeToggle: () => void;
  handleUploadClick: () => void;
  handleRemovePdf: () => Promise<void>;
  handleClearChat: () => Promise<void>;
  handleFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  inputValue: string;
  setInputValue: React.Dispatch<React.SetStateAction<string>>;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleStopStream: () => void;
  isStreaming: boolean;
  isResearching: boolean;
  isLoading: boolean;
  isPdfUploaded: boolean;
}

const ChatControls: React.FC<ChatControlsProps> = ({
  error,
  chatMode,
  pdfFile,
  fileInputRef,
  handleModeToggle,
  handleUploadClick,
  handleRemovePdf,
  handleClearChat,
  handleFileSelect,
  inputValue,
  setInputValue,
  handleSubmit,
  handleStopStream,
  isStreaming,
  isResearching,
  isLoading,
  isPdfUploaded
}) => {
  return (
    <div className="fixed bottom-6 left-0 right-0 mx-auto w-full max-w-3xl px-4 z-10">
      {/* Show error message if any */}
      {error && <div className="bg-red-100 text-red-700 px-4 py-2 text-center text-sm mb-2 rounded-t-lg shadow-md">{error}</div>}
      
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        {/* Controls toolbar */}
        <ChatToolbar
          chatMode={chatMode}
          setChatMode={handleModeToggle}
          pdfFile={pdfFile}
          fileInputRef={fileInputRef}
          handleUploadClick={handleUploadClick}
          handleRemovePdf={handleRemovePdf}
          handleClearChat={handleClearChat}
          handleFileSelect={handleFileSelect}
          isDisabled={isStreaming || isResearching || isLoading}
        />
        
        {/* Input form */}
        <ChatInput
          inputValue={inputValue}
          setInputValue={setInputValue}
          handleSubmit={handleSubmit}
          handleStopStream={handleStopStream}
          isStreaming={isStreaming}
          isResearching={isResearching}
          isLoading={isLoading}
          chatMode={chatMode}
          isPdfUploaded={isPdfUploaded}
        />
      </div>
    </div>
  );
};

export default ChatControls;
