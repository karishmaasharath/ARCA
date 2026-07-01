import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrainCircuit } from 'lucide-react';
export function Popup() {
    const [platform, setPlatform] = useState('Unknown');
    const [devMode, setDevMode] = useState(false);
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
    }, []);
    return (_jsxs("div", { className: "popup-container", children: [_jsxs("div", { className: "header", children: [_jsx("div", { className: "logo-box", children: _jsx(BrainCircuit, { size: 16 }) }), _jsxs("div", { className: "header-text", children: [_jsx("h1", { children: "ARCA" }), _jsx("p", { children: "Adaptive Retrieval & Context Architecture" })] })] }), _jsxs("div", { className: "card", children: [_jsxs("div", { className: "row", children: [_jsx("span", { className: "label", children: "Extension Status" }), _jsx("span", { className: "badge badge-green", children: "\uD83D\uDFE2 Enabled" })] }), _jsxs("div", { className: "row", children: [_jsx("span", { className: "label", children: "Detected Platform" }), _jsx("span", { className: "value", children: platform })] }), _jsxs("div", { className: "toggle-container", children: [_jsx("span", { className: "label", children: "Developer Mode" }), _jsxs("label", { className: "switch", children: [_jsx("input", { type: "checkbox", checked: devMode, onChange: (e) => setDevMode(e.target.checked) }), _jsx("span", { className: "slider" })] })] })] }), _jsxs("div", { className: "placeholder-section", children: [_jsx("span", { className: "section-title", children: "Context Analysis" }), _jsxs("div", { className: "placeholder-item", children: [_jsx("span", { children: "Memory Viewer" }), _jsx("span", { className: "coming-soon", children: "Coming Soon" })] }), _jsxs("div", { className: "placeholder-item", children: [_jsx("span", { children: "Context Health" }), _jsx("span", { className: "coming-soon", children: "Coming Soon" })] }), _jsxs("div", { className: "placeholder-item", children: [_jsx("span", { children: "Token Savings" }), _jsx("span", { className: "coming-soon", children: "Coming Soon" })] }), _jsxs("div", { className: "placeholder-item", children: [_jsx("span", { children: "Optimization Trace" }), _jsx("span", { className: "coming-soon", children: "Coming Soon" })] })] }), _jsx("div", { className: "footer", children: "Version 0.1.0" })] }));
}
const rootEl = document.getElementById('popup-root');
if (rootEl) {
    ReactDOM.createRoot(rootEl).render(_jsx(React.StrictMode, { children: _jsx(Popup, {}) }));
}
