export interface PlatformConfig {
  name: 'ChatGPT' | 'Claude' | 'Gemini';
  urlKeywords: string[];
  userMessageSelector: string;
  textNodeSelector?: string;
}

export const PLATFORM_CONFIGS: Record<'ChatGPT' | 'Claude' | 'Gemini', PlatformConfig> = {
  ChatGPT: {
    name: 'ChatGPT',
    urlKeywords: ['chatgpt.com', 'chat.openai.com'],
    userMessageSelector: '[data-message-author-role="user"]',
    textNodeSelector: '.whitespace-pre-wrap'
  },
  Claude: {
    name: 'Claude',
    urlKeywords: ['claude.ai'],
    userMessageSelector: '.font-user-message'
  },
  Gemini: {
    name: 'Gemini',
    urlKeywords: ['gemini.google.com'],
    userMessageSelector: 'user-query, .query-text'
  }
};

/**
 * Detects the active LLM platform based on the current window location.
 */
export function detectPlatform(): 'ChatGPT' | 'Claude' | 'Gemini' | 'Unknown' {
  const url = window.location.href.toLowerCase();
  
  for (const config of Object.values(PLATFORM_CONFIGS)) {
    if (config.urlKeywords.some(keyword => url.includes(keyword))) {
      return config.name;
    }
  }
  
  return 'Unknown';
}

/**
 * Gets the configuration for a specific platform.
 */
export function getPlatformConfig(platform: 'ChatGPT' | 'Claude' | 'Gemini' | 'Unknown'): PlatformConfig | null {
  if (platform === 'Unknown') return null;
  return PLATFORM_CONFIGS[platform];
}
