// Default React (web) project template files

export const DEFAULT_FILES = {
    'package.json': `{
  "name": "my-react-app",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build"
  }
}`,

    'index.js': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,

    'App.js': `import React, { useState } from 'react';
import './App.css';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="container">
      <h1 className="title">⚛ React Code Editor</h1>
      <p className="subtitle">Edit this code and press Run!</p>

      <div className="card">
        <p className="counter">{count}</p>
        <button className="btn btn-primary" onClick={() => setCount(count + 1)}>
          Press Me!
        </button>
        <button className="btn btn-secondary" onClick={() => setCount(0)}>
          Reset
        </button>
      </div>
    </div>
  );
}`,

    'App.css': `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background-color: #0d1117;
  color: #c9d1d9;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  min-height: 100vh;
}

.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
}

.title {
  font-size: 2rem;
  font-weight: 800;
  color: #58a6ff;
  margin-bottom: 8px;
}

.subtitle {
  font-size: 0.9rem;
  color: #8b949e;
  margin-bottom: 40px;
}

.card {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 16px;
  padding: 36px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  min-width: 260px;
}

.counter {
  font-size: 4rem;
  font-weight: 700;
  color: #58a6ff;
  margin-bottom: 8px;
}

.btn {
  width: 100%;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn:hover {
  opacity: 0.85;
}

.btn-primary {
  background-color: #238636;
  color: #ffffff;
}

.btn-secondary {
  background-color: #21262d;
  color: #c9d1d9;
  border: 1px solid #30363d;
}`,
};

export const FILE_ORDER = ['App.js', 'App.css', 'index.js', 'package.json'];
