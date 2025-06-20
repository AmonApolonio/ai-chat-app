import React from 'react';
import './App.css';
import ChatBox from './components/ChatBox';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Company Research Assistant</h1>
        <p className="app-subtitle">Ask me about any company you'd like to research!</p>
        <div className="chat-container">
          <ChatBox />
        </div>
      </header>
    </div>
  );
}

export default App;
