import { PlatformConfig, PlatformType } from './types';

export class AdaptiveTokenAllocator {
  private static CONFIGS: Record<PlatformType, PlatformConfig> = {
    chatgpt: {
      maxTokens: 8192,
      compressionStrategy: 'moderate'
    },
    claude: {
      maxTokens: 64000,
      compressionStrategy: 'minimal'
    },
    gemini: {
      maxTokens: 128000,
      compressionStrategy: 'minimal'
    },
    local: {
      maxTokens: 4096,
      compressionStrategy: 'aggressive'
    }
  };

  /**
   * Detects the active platform based on the browser window URL.
   * Defaults to 'local' if no known URL pattern is matched.
   */
  public static detectPlatform(url?: string): PlatformType {
    const targetUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
    
    if (!targetUrl) return 'local';

    const normalized = targetUrl.toLowerCase();
    if (normalized.includes('chatgpt.com') || normalized.includes('chat.openai.com')) {
      return 'chatgpt';
    } else if (normalized.includes('claude.ai')) {
      return 'claude';
    } else if (normalized.includes('gemini.google.com')) {
      return 'gemini';
    } else if (normalized.includes('perplexity.ai')) {
      // Perplexity acts as search context, moderate tokens
      return 'chatgpt';
    }

    return 'local';
  }

  /**
   * Returns the config (token budgets, compression rules) for the selected platform.
   */
  public static getConfig(platform: PlatformType): PlatformConfig {
    return this.CONFIGS[platform] || this.CONFIGS.local;
  }
}
