import React, { useState } from 'react';
import ChatBox from './components/ChatBox';
// Import FontAwesome
import { library } from '@fortawesome/fontawesome-svg-core';
import { fab } from '@fortawesome/free-brands-svg-icons';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { ChatMode } from './types/chat';

// Add icons to the library for global use
library.add(fab, fas, far);

function App() {
  const [chatMode, setChatMode] = useState<ChatMode>(ChatMode.RESEARCH);
  
  // Define header titles based on mode
  const getHeaderTitle = () => {
    switch (chatMode) {
      case ChatMode.PDF:
        return "Hackett PDF Document Assistant";
      case ChatMode.RESEARCH:
      default:
        return "Hackett Company Research Assistant";
    }
  };
  
  // Define header descriptions based on mode
  const getHeaderDescription = () => {
    switch (chatMode) {
      case ChatMode.PDF:
        return "Upload a PDF to ask questions about its content!";
      case ChatMode.RESEARCH:
      default:
        return "Ask me about any company you'd like to research!";
    }
  };

  return (
    <div className="text-center">
      <header className="min-h-screen flex flex-col items-center bg-gray-100 pt-5">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">{getHeaderTitle()}</h1>
        <p className="text-gray-600 text-sm mb-4 italic">{getHeaderDescription()}</p>
        <div className="w-full max-w-3xl px-4">
          <ChatBox initialMode={chatMode} onModeChange={setChatMode} />
        </div>
      </header>
    </div>
  );
}

export default App;
