/**
 * Detects the active LLM platform based on the current window location.
 */
export function detectPlatform(): 'ChatGPT' | 'Claude' | 'Gemini' | 'Unknown' {
  const url = window.location.href.toLowerCase();
  
  if (url.includes('chatgpt.com') || url.includes('chat.openai.com')) {
    return 'ChatGPT';
  }
  if (url.includes('claude.ai')) {
    return 'Claude';
  }
  if (url.includes('gemini.google.com')) {
    return 'Gemini';
  }
  
  return 'Unknown';
}

// Log detection on content script load
const detected = detectPlatform();
if (detected !== 'Unknown') {
  console.log(`[ARCA Content] Detected Platform: ${detected}`);
}
