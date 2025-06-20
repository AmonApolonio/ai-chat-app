import React from 'react';
import { ChatMode } from '../types/chat';
import { useChat } from './chat/useChat';
import ChatMessages from './chat/ChatMessages';
import ChatControls from './chat/ChatControls';
import PdfHandler from './chat/PdfHandler';

interface ChatBoxProps {
  initialMode?: ChatMode;
  onModeChange?: (mode: ChatMode) => void;
}

const ChatBox: React.FC<ChatBoxProps> = ({ initialMode, onModeChange }) => {
  const {
    messages,
    inputValue,
    setInputValue,
    isLoading,
    isStreaming,
    isResearching,
    error,
    currentStreamingMessage,
    messageContainerRef,
    fileInputRef,
    chatMode,
    pdfFile,
    isPdfUploaded,
    isDragging,
    handleModeToggle,
    handleFileSelect,
    handleDrop,
    handleRemovePdf,
    handleUploadClick,
    handleStopStream,
    handleSubmit,
    handleClearChat,
    handleDragEnter,
    handleDragLeave,
    handleDragOver
  } = useChat({ initialMode, onModeChange });
  
  return (
    <div 
      className="w-full max-w-7xl mx-auto flex flex-col h-[calc(100vh-200px)] bg-gray-50 relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Message history container */}
      <ChatMessages 
        messages={messages}
        isResearching={isResearching}
        isLoading={isLoading}
        currentStreamingMessage={currentStreamingMessage}
        messageContainerRef={messageContainerRef}
      />

      {/* Floating toolbar and input section - fixed at bottom center */}
      <ChatControls 
        error={error}
        chatMode={chatMode}
        pdfFile={pdfFile}
        fileInputRef={fileInputRef}
        handleModeToggle={handleModeToggle}
        handleUploadClick={handleUploadClick}
        handleRemovePdf={handleRemovePdf}
        handleClearChat={handleClearChat}
        handleFileSelect={handleFileSelect}
        inputValue={inputValue}
        setInputValue={setInputValue}
        handleSubmit={handleSubmit}
        handleStopStream={handleStopStream}
        isStreaming={isStreaming}
        isResearching={isResearching}
        isLoading={isLoading}
        isPdfUploaded={isPdfUploaded}
      />
      
      {/* PDF upload handler */}
      <PdfHandler
        isDragging={isDragging}
        fileInputRef={fileInputRef}
        handleFileSelect={handleFileSelect}
        handleDrop={handleDrop}
        isPdfUploaded={isPdfUploaded}
      />
    </div>
  );
};

export default ChatBox;
