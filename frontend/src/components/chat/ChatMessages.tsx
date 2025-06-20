import React from 'react';
import { ChatMessage } from '../../types/chat';
import ChatMessageComponent from '../ChatMessage';
import MessageStatus from '../MessageStatus';
import StreamingMessage from '../StreamingMessage';

interface ChatMessagesProps {
  messages: ChatMessage[];
  isResearching: boolean;
  isLoading: boolean;
  isStreaming: boolean;
  isFormatting: boolean;
  currentStreamingMessage: string;
  messageContainerRef: React.RefObject<HTMLDivElement | null>;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  isResearching,
  isLoading,
  isStreaming,
  isFormatting,
  currentStreamingMessage,
  messageContainerRef
}) => {
  return (
    <div
      className="flex-1 overflow-y-auto px-6 pb-32 pt-4 space-y-6"
      ref={messageContainerRef}
    >
      {/* Messages */}
      {messages.map((message) => (
        <ChatMessageComponent key={message.id} message={message} />
      ))}
      {/* Status indicators */}      
      <MessageStatus
        isResearching={isResearching}
        isLoading={isLoading}
        currentStreamingMessage={currentStreamingMessage}
        isFormatting={isFormatting}
      />

      {/* Streaming message - only show when there's actually streaming content */}
      {currentStreamingMessage && isStreaming && (
        <StreamingMessage text={currentStreamingMessage} />
      )}
    </div>
  );
};

export default ChatMessages;
