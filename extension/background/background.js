"use strict";
console.log('ARCA Extension Initialized');
let lastPlatform = 'Unknown';
let lastPrompt = 'Waiting...';
chrome.runtime.onInstalled.addListener(() => {
    console.log('ARCA Extension service worker installed and active');
});
// Listener for observation events and popup requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'ARCA_PROMPT_OBSERVED') {
        const { platform, timestamp, prompt } = message.payload;
        lastPlatform = platform;
        lastPrompt = prompt;
        console.log(`ARCA Prompt Observed\n\nPlatform: ${platform}\nTime: ${timestamp}\nPrompt:\n\n${prompt}`);
    }
    else if (message.type === 'ARCA_GET_LAST_OBSERVATION') {
        sendResponse({
            platform: lastPlatform,
            prompt: lastPrompt
        });
    }
    return true; // Keeps the sendResponse channel open for async calls
});
