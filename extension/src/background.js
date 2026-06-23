import { ARCA } from 'arca-sdk';
const arca = new ARCA();
console.log('ARCA background service worker active');
// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const handleMessage = async () => {
        switch (message.action) {
            case 'OPTIMIZE_PROMPT':
                try {
                    const { text, platform } = message.payload;
                    const result = await arca.optimize(text, platform);
                    return { success: true, data: result };
                }
                catch (e) {
                    console.error('ARCA optimization error in background:', e);
                    return { success: false, error: e.message || 'Optimization failed' };
                }
            case 'INGEST_MEMORY':
                try {
                    const { content, type, pinned } = message.payload;
                    const newMem = await arca.ingest(content, { type, pinned });
                    return { success: true, data: newMem };
                }
                catch (e) {
                    return { success: false, error: e.message };
                }
            case 'GET_MEMORIES':
                try {
                    const memories = await arca.getStore().getAll();
                    return { success: true, data: memories };
                }
                catch (e) {
                    return { success: false, error: e.message };
                }
            case 'DELETE_MEMORY':
                try {
                    const { id } = message.payload;
                    await arca.delete(id);
                    return { success: true };
                }
                catch (e) {
                    return { success: false, error: e.message };
                }
            case 'PIN_MEMORY':
                try {
                    const { id, pinned } = message.payload;
                    await arca.pin(id, pinned);
                    return { success: true };
                }
                catch (e) {
                    return { success: false, error: e.message };
                }
            default:
                return { success: false, error: `Unknown action: ${message.action}` };
        }
    };
    // Execute async handler and respond
    handleMessage().then(sendResponse);
    return true; // Keep message channel open for async response
});
