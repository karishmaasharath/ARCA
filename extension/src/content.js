"use strict";
// ARCA Content Injected Script
// Custom CSS styled widget injector
const CSS_STYLES = `
  .arca-badge-container {
    position: absolute;
    right: 12px;
    bottom: 12px;
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    user-select: none;
  }
  .arca-badge-btn {
    background: #0B132B;
    color: #5BC0BE;
    border: 1px solid rgba(91, 192, 190, 0.4);
    border-radius: 20px;
    padding: 6px 12px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    transition: all 0.2s ease-in-out;
  }
  .arca-badge-btn:hover {
    background: #1C2541;
    border-color: #5BC0BE;
    transform: translateY(-1px);
  }
  .arca-badge-btn.loading {
    opacity: 0.8;
    cursor: wait;
  }
  .arca-stats-pill {
    background: rgba(91, 192, 190, 0.1);
    color: #82D2D0;
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 9px;
    font-family: monospace;
    border: 1px solid rgba(91, 192, 190, 0.2);
  }
`;
// Helper to inject CSS styles once
function injectStyles() {
    if (document.getElementById('arca-extension-styles'))
        return;
    const styleEl = document.createElement('style');
    styleEl.id = 'arca-extension-styles';
    styleEl.textContent = CSS_STYLES;
    document.head.appendChild(styleEl);
}
// Find prompt text areas per LLM platform
function findPromptInput() {
    const url = window.location.href.toLowerCase();
    if (url.includes('chat.openai.com') || url.includes('chatgpt.com')) {
        return document.getElementById('prompt-textarea');
    }
    if (url.includes('claude.ai')) {
        // Claude uses a ProseMirror contenteditable div
        return document.querySelector('div[contenteditable="true"]');
    }
    if (url.includes('gemini.google.com')) {
        // Gemini uses a contenteditable div
        return document.querySelector('div[contenteditable="true"].textarea') || document.querySelector('div[contenteditable="true"]');
    }
    if (url.includes('perplexity.ai')) {
        return document.querySelector('textarea[placeholder*="ask"]') || document.querySelector('textarea');
    }
    return document.querySelector('textarea, div[contenteditable="true"]');
}
// Set value for React-controlled inputs safely
function setInputValue(element, value) {
    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
        const prototype = Object.getPrototypeOf(element);
        const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
        if (valueSetter) {
            valueSetter.call(element, value);
        }
        else {
            element.value = value;
        }
        // Dispatch input event for state update
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }
    else if (element.getAttribute('contenteditable') === 'true') {
        element.innerHTML = '';
        const p = document.createElement('p');
        p.textContent = value;
        element.appendChild(p);
        // Dispatch Input event for contenteditables
        element.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }
}
// Get value from input
function getInputValue(element) {
    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
        return element.value;
    }
    else if (element.getAttribute('contenteditable') === 'true') {
        return element.innerText || '';
    }
    return '';
}
// Create and mount the widget
function injectArcaBadge() {
    const inputEl = findPromptInput();
    if (!inputEl)
        return;
    // Verify if container exists or if badge is already injected
    const parent = inputEl.parentElement;
    if (!parent)
        return;
    if (parent.querySelector('.arca-badge-container'))
        return;
    // In systems like ChatGPT and Claude, inputs are absolute or relative
    // Make sure the parent container is relative so absolute positioning works
    if (window.getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
    }
    injectStyles();
    // Create badge
    const container = document.createElement('div');
    container.className = 'arca-badge-container';
    const btn = document.createElement('button');
    btn.className = 'arca-badge-btn';
    btn.innerHTML = `🛡️ ARCA: Optimize`;
    const stats = document.createElement('span');
    stats.className = 'arca-stats-pill';
    stats.style.display = 'none';
    container.appendChild(stats);
    container.appendChild(btn);
    btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const originalText = getInputValue(inputEl);
        if (!originalText.trim())
            return;
        btn.innerText = '⏳ Optimizing...';
        btn.classList.add('loading');
        // Get target platform context name
        const platform = window.location.href.includes('claude.ai') ? 'claude'
            : window.location.href.includes('gemini') ? 'gemini'
                : 'chatgpt';
        chrome.runtime.sendMessage({
            action: 'OPTIMIZE_PROMPT',
            payload: { text: originalText, platform }
        }, (response) => {
            btn.innerHTML = `🛡️ ARCA: Optimized`;
            btn.classList.remove('loading');
            if (response && response.success && response.data) {
                setInputValue(inputEl, response.data.optimizedPrompt);
                // Show token metrics info
                const saving = response.data.metrics.tokenSavingsRate;
                stats.innerText = `-${saving}% Tokens`;
                stats.style.display = 'inline-block';
                setTimeout(() => {
                    btn.innerHTML = `🛡️ ARCA: Optimize`;
                }, 3000);
            }
            else {
                console.error('ARCA Optimization failed:', response?.error);
                btn.innerHTML = `❌ Error`;
                setTimeout(() => {
                    btn.innerHTML = `🛡️ ARCA: Optimize`;
                }, 3000);
            }
        });
    });
    parent.appendChild(container);
}
// Observe modifications in DOM to handle dynamic re-renders
const observer = new MutationObserver((mutations) => {
    injectArcaBadge();
});
observer.observe(document.body, {
    childList: true,
    subtree: true
});
// Run initial injection
setTimeout(injectArcaBadge, 1500);
