import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrainCircuit } from 'lucide-react';
export function Popup() {
    const [platform, setPlatform] = useState('Unknown');
    const [devMode, setDevMode] = useState(false);
    const [lastPlatform, setLastPlatform] = useState('Unknown');
    const [lastPrompt, setLastPrompt] = useState('Waiting...');
    useEffect(() => {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const url = tabs[0]?.url || '';
                if (url.includes('chatgpt.com') || url.includes('chat.openai.com')) {
                    setPlatform('ChatGPT');
                }
                else if (url.includes('claude.ai')) {
                    setPlatform('Claude');
                }
                else if (url.includes('gemini.google.com')) {
                    setPlatform('Gemini');
                }
                else {
                    setPlatform('Unknown');
                }
            });
        }
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.sendMessage({ type: 'ARCA_GET_LAST_OBSERVATION' }, (response) => {
                if (response) {
                    setLastPlatform(response.platform || 'Unknown');
                    setLastPrompt(response.prompt || 'Waiting...');
                }
            });
        }
    }, []);
    const formatPrompt = (text) => {
        if (text === 'Waiting...')
            return text;
        if (text.length > 60) {
            return text.substring(0, 60) + '...';
        }
        return text;
    };
    return (_jsxs("div", { className: "popup-container", children: [_jsxs("div", { className: "header", children: [_jsx("div", { className: "logo-box", children: _jsx(BrainCircuit, { size: 16 }) }), _jsxs("div", { className: "header-text", children: [_jsx("h1", { children: "ARCA" }), _jsx("p", { children: "Adaptive Retrieval & Context Architecture" })] })] }), _jsxs("div", { className: "card", children: [_jsxs("div", { className: "row", children: [_jsx("span", { className: "label", children: "Extension Status" }), _jsx("span", { className: "badge badge-green", children: "\uD83D\uDFE2 Enabled" })] }), _jsxs("div", { className: "row", children: [_jsx("span", { className: "label", children: "Detected Platform" }), _jsx("span", { className: "value", children: platform })] }), _jsxs("div", { className: "toggle-container", children: [_jsx("span", { className: "label", children: "Developer Mode" }), _jsxs("label", { className: "switch", children: [_jsx("input", { type: "checkbox", checked: devMode, onChange: (e) => setDevMode(e.target.checked) }), _jsx("span", { className: "slider" })] })] })] }), _jsxs("div", { className: "card", children: [_jsxs("div", { className: "row", children: [_jsx("span", { className: "label", children: "Observation Status" }), platform !== 'Unknown' ? (_jsx("span", { className: "badge badge-green", children: "\uD83D\uDFE2 Listening" })) : (_jsx("span", { className: "badge", style: { backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#94a3b8', border: '1px solid rgba(255, 255, 255, 0.1)' }, children: "\u26AA Unsupported Site" }))] }), _jsxs("div", { className: "row", children: [_jsx("span", { className: "label", children: "Last Detected Platform" }), _jsx("span", { className: "value", children: lastPlatform !== 'Unknown' && lastPlatform !== '' ? lastPlatform : '—' })] }), _jsxs("div", { className: "row", style: { flexDirection: 'column', alignItems: 'flex-start', gap: '4px', marginTop: '4px' }, children: [_jsx("span", { className: "label", children: "Last Prompt" }), _jsx("span", { className: "value", style: {
                                    fontFamily: 'JetBrains Mono, monospace',
                                    fontSize: '10px',
                                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                    padding: '6px 8px',
                                    borderRadius: '4px',
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    wordBreak: 'break-all',
                                    whiteSpace: 'pre-wrap',
                                    color: lastPrompt === 'Waiting...' ? '#64748b' : '#e2e8f0',
                                    border: '1px solid rgba(255, 255, 255, 0.05)'
                                }, children: formatPrompt(lastPrompt) })] })] }), _jsxs("div", { className: "placeholder-section", children: [_jsx("span", { className: "section-title", children: "Context Analysis" }), _jsxs("div", { className: "placeholder-item", children: [_jsx("span", { children: "Memory Viewer" }), _jsx("span", { className: "coming-soon", children: "Coming Soon" })] }), _jsxs("div", { className: "placeholder-item", children: [_jsx("span", { children: "Context Health" }), _jsx("span", { className: "coming-soon", children: "Coming Soon" })] }), _jsxs("div", { className: "placeholder-item", children: [_jsx("span", { children: "Token Savings" }), _jsx("span", { className: "coming-soon", children: "Coming Soon" })] }), _jsxs("div", { className: "placeholder-item", children: [_jsx("span", { children: "Optimization Trace" }), _jsx("span", { className: "coming-soon", children: "Coming Soon" })] })] }), _jsx("div", { className: "footer", children: "Version 0.1.0" })] }));
}
const rootEl = document.getElementById('popup-root');
if (rootEl) {
    ReactDOM.createRoot(rootEl).render(_jsx(React.StrictMode, { children: _jsx(Popup, {}) }));
}
