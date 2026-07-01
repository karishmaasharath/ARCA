import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrainCircuit } from 'lucide-react';

export function Popup() {
  const [platform, setPlatform] = useState<string>('Unknown');
  const [devMode, setDevMode] = useState<boolean>(false);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = tabs[0]?.url || '';
        if (url.includes('chatgpt.com') || url.includes('chat.openai.com')) {
          setPlatform('ChatGPT');
        } else if (url.includes('claude.ai')) {
          setPlatform('Claude');
        } else if (url.includes('gemini.google.com')) {
          setPlatform('Gemini');
        } else {
          setPlatform('Unknown');
        }
      });
    }
  }, []);

  return (
    <div className="popup-container">
      {/* Header */}
      <div className="header">
        <div className="logo-box">
          <BrainCircuit size={16} />
        </div>
        <div className="header-text">
          <h1>ARCA</h1>
          <p>Adaptive Retrieval & Context Architecture</p>
        </div>
      </div>

      {/* Main card */}
      <div className="card">
        <div className="row">
          <span className="label">Extension Status</span>
          <span className="badge badge-green">🟢 Enabled</span>
        </div>
        <div className="row">
          <span className="label">Detected Platform</span>
          <span className="value">{platform}</span>
        </div>
        <div className="toggle-container">
          <span className="label">Developer Mode</span>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={devMode}
              onChange={(e) => setDevMode(e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      {/* Future features placeholders */}
      <div className="placeholder-section">
        <span className="section-title">Context Analysis</span>
        
        <div className="placeholder-item">
          <span>Memory Viewer</span>
          <span className="coming-soon">Coming Soon</span>
        </div>
        <div className="placeholder-item">
          <span>Context Health</span>
          <span className="coming-soon">Coming Soon</span>
        </div>
        <div className="placeholder-item">
          <span>Token Savings</span>
          <span className="coming-soon">Coming Soon</span>
        </div>
        <div className="placeholder-item">
          <span>Optimization Trace</span>
          <span className="coming-soon">Coming Soon</span>
        </div>
      </div>

      {/* Footer */}
      <div className="footer">
        Version 0.1.0
      </div>
    </div>
  );
}

const rootEl = document.getElementById('popup-root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <Popup />
    </React.StrictMode>
  );
}
