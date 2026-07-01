import { startPromptObserver } from './promptObserver';
console.log('[ARCA Content] Script initialized');
startPromptObserver((event) => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
            type: 'ARCA_PROMPT_OBSERVED',
            payload: event
        });
    }
});
