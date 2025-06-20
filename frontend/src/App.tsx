import React from 'react';
import './App.css';
import ChatBox from './components/ChatBox';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Chat Application</h1>
        <div className="chat-container">
          <ChatBox />
        </div>
      </header>
    </div>
  );
}

export default App;
