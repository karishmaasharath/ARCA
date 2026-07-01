"use strict";
console.log('ARCA Extension Initialized');
chrome.runtime.onInstalled.addListener(() => {
    console.log('ARCA Extension service worker installed and active');
});
