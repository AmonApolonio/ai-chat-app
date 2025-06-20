import React from 'react';
import ChatBox from './components/ChatBox';
// Import FontAwesome
import { library } from '@fortawesome/fontawesome-svg-core';
import { fab } from '@fortawesome/free-brands-svg-icons';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';

// Add icons to the library for global use
library.add(fab, fas, far);

function App() {
  return (
    <div className="text-center">
      <header className="min-h-screen flex flex-col items-center bg-gray-100 pt-10">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Company Research Assistant</h1>
        <p className="text-gray-600 text-base mb-8 italic">Ask me about any company you'd like to research!</p>
        <div className="w-full max-w-2xl px-4">
          <ChatBox />
        </div>
      </header>
    </div>
  );
}

export default App;
