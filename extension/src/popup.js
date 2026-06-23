import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrainCircuit, Pin, ExternalLink, Plus, Trash2 } from 'lucide-react';
export function Popup() {
    const [memories, setMemories] = useState([]);
    const [newContent, setNewContent] = useState('');
    const [newType, setNewType] = useState('immutable');
    // Load memories from background
    const fetchMemories = () => {
        chrome.runtime.sendMessage({ action: 'GET_MEMORIES' }, (response) => {
            if (response && response.success && response.data) {
                setMemories(response.data);
            }
        });
    };
    useEffect(() => {
        fetchMemories();
    }, []);
    const handleIngest = (e) => {
        e.preventDefault();
        if (!newContent.trim())
            return;
        chrome.runtime.sendMessage({
            action: 'INGEST_MEMORY',
            payload: { content: newContent, type: newType }
        }, (response) => {
            if (response && response.success) {
                setNewContent('');
                fetchMemories();
            }
        });
    };
    const handleDelete = (id) => {
        chrome.runtime.sendMessage({
            action: 'DELETE_MEMORY',
            payload: { id }
        }, (response) => {
            if (response && response.success) {
                fetchMemories();
            }
        });
    };
    const openDashboard = () => {
        chrome.tabs.create({ url: 'http://localhost:5173' });
    };
    const immutableCount = memories.filter(m => m.type === 'immutable').length;
    return (_jsxs("div", { style: { padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [_jsx("div", { style: { padding: '6px', backgroundColor: 'rgba(91, 192, 190, 0.1)', border: '1px solid #5BC0BE', borderRadius: '6px', color: '#5BC0BE' }, children: _jsx(BrainCircuit, { size: 16 }) }), _jsxs("div", { children: [_jsx("h1", { style: { margin: 0, fontSize: '14px', fontWeight: 'bold', fontFamily: 'monospace' }, children: "ARCA" }), _jsx("p", { style: { margin: 0, fontSize: '9px', color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.5px' }, children: "Context governance" })] })] }), _jsxs("button", { onClick: openDashboard, style: { marginLeft: 'auto', background: 'none', border: 'none', color: '#5BC0BE', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', cursor: 'pointer', fontFamily: 'monospace' }, children: ["DASHBOARD ", _jsx(ExternalLink, { size: 10 })] })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }, children: [_jsxs("div", { style: { backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px', textAlign: 'center' }, children: [_jsx("span", { style: { fontSize: '9px', color: '#a0aec0', display: 'block', marginBottom: '2px', textTransform: 'uppercase' }, children: "Active Rules" }), _jsx("span", { style: { fontSize: '16px', fontWeight: 'bold', color: '#5BC0BE', fontFamily: 'monospace' }, children: immutableCount })] }), _jsxs("div", { style: { backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px', textAlign: 'center' }, children: [_jsx("span", { style: { fontSize: '9px', color: '#a0aec0', display: 'block', marginBottom: '2px', textTransform: 'uppercase' }, children: "Total Memories" }), _jsx("span", { style: { fontSize: '16px', fontWeight: 'bold', color: '#e2e8f0', fontFamily: 'monospace' }, children: memories.length })] })] }), _jsxs("form", { onSubmit: handleIngest, style: { display: 'flex', flexDirection: 'column', gap: '6px' }, children: [_jsx("span", { style: { fontSize: '9px', color: '#a0aec0', textTransform: 'uppercase', fontFamily: 'monospace' }, children: "Quick Ingest Rule" }), _jsxs("div", { style: { display: 'flex', gap: '6px' }, children: [_jsx("input", { type: "text", value: newContent, onChange: (e) => setNewContent(e.target.value), placeholder: "e.g. Always use TypeScript.", style: { flex: 1, backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '4px', padding: '6px 10px', fontSize: '11px', color: '#f8fafc', outline: 'none', fontFamily: 'monospace' } }), _jsx("button", { type: "submit", style: { backgroundColor: '#5BC0BE', color: '#050B14', border: 'none', borderRadius: '4px', width: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }, children: _jsx(Plus, { size: 14 }) })] })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '6px' }, children: [_jsx("span", { style: { fontSize: '9px', color: '#a0aec0', textTransform: 'uppercase', fontFamily: 'monospace', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }, children: "In-Context Constraints" }), _jsx("div", { style: { maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '2px' }, children: memories.length === 0 ? (_jsx("div", { style: { fontSize: '11px', color: '#64748b', textAlign: 'center', padding: '16px 0' }, children: "No active context memories loaded." })) : (memories.slice(0, 4).map(mem => (_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'between', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px', padding: '6px 8px', fontSize: '10px' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', flex: 1 }, children: [mem.type === 'immutable' && _jsx(Pin, { size: 10, style: { color: '#5BC0BE', flexShrink: 0 } }), _jsx("span", { style: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: mem.type === 'immutable' ? '#fff' : '#cbd5e1', fontFamily: 'monospace' }, children: mem.content })] }), mem.type !== 'immutable' && (_jsx("button", { onClick: () => handleDelete(mem.id), style: { background: 'none', border: 'none', color: '#ef4444', opacity: 0.7, cursor: 'pointer', padding: '2px', marginLeft: '6px' }, children: _jsx(Trash2, { size: 10 }) }))] }, mem.id)))) })] })] }));
}
const rootEl = document.getElementById('popup-root');
if (rootEl) {
    ReactDOM.createRoot(rootEl).render(_jsx(React.StrictMode, { children: _jsx(Popup, {}) }));
}
