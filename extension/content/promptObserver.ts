import { detectPlatform, getPlatformConfig } from './platformDetector';

// Keep track of already processed message elements
const processedElements = new WeakSet<Element>();

// Keep track of recently emitted prompt texts to prevent duplicates
const recentlyEmittedPrompts = new Set<string>();
const MAX_RECENT_PROMPTS = 10;

export interface PromptEvent {
  platform: string;
  timestamp: string;
  prompt: string;
}

export function startPromptObserver(onPromptCaptured: (event: PromptEvent) => void) {
  const platformName = detectPlatform();
  if (platformName === 'Unknown') {
    return;
  }

  const platformConfig = getPlatformConfig(platformName);
  if (!platformConfig) return;

  console.log(`[ARCA Observer] Starting observer for ${platformName}...`);

  // Initialize: Mark all existing message elements as processed on load so we don't emit history
  const existingMessages = document.querySelectorAll(platformConfig.userMessageSelector);
  existingMessages.forEach(el => {
    processedElements.add(el);
  });

  const observer = new MutationObserver(() => {
    // Query all user message elements currently in the DOM
    const currentMessages = document.querySelectorAll(platformConfig.userMessageSelector);
    
    currentMessages.forEach(el => {
      if (processedElements.has(el)) return;

      // Extract text content
      let text = '';
      if (platformConfig.textNodeSelector) {
        const textEl = el.querySelector(platformConfig.textNodeSelector);
        text = textEl ? textEl.textContent || '' : el.textContent || '';
      } else {
        text = el.textContent || '';
      }

      text = text.trim();
      if (!text) return;

      // Mark as processed
      processedElements.add(el);

      // Duplicate protection: Check if we recently emitted the exact same text
      if (recentlyEmittedPrompts.has(text)) {
        return;
      }

      // Add to recently emitted cache
      recentlyEmittedPrompts.add(text);
      if (recentlyEmittedPrompts.size > MAX_RECENT_PROMPTS) {
        const first = recentlyEmittedPrompts.values().next().value;
        if (first !== undefined) {
          recentlyEmittedPrompts.delete(first);
        }
      }

      // Emit event
      const event: PromptEvent = {
        platform: platformName,
        timestamp: new Date().toLocaleTimeString(),
        prompt: text
      };

      console.log('[ARCA Observer] Captured prompt:', event);
      onPromptCaptured(event);
    });
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  return observer;
}
