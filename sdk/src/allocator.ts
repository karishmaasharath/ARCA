import { ContextAllocation, PlatformConfig, PlatformType } from './types';
import { estimateTokens } from './utils';

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

export class ContextAllocator {
  /**
   * Calculates the context division, memory budget, and allocation state.
   */
  public static allocate(
    userPrompt: string,
    maxContextWindow: number,
    options?: {
      reservedResponseTokens?: number;
      safetyBuffer?: number;
    }
  ): ContextAllocation {
    const promptTokens = estimateTokens(userPrompt);
    const safetyBuffer = options?.safetyBuffer ?? 500;

    // Deterministic tiered heuristic for response reservation if not explicitly provided
    let reservedResponseTokens = options?.reservedResponseTokens;
    if (reservedResponseTokens === undefined) {
      if (promptTokens < 1000) {
        reservedResponseTokens = 1000;
      } else if (promptTokens < 4000) {
        reservedResponseTokens = 1500;
      } else {
        reservedResponseTokens = 2000;
      }
    }

    let availableMemoryBudget = maxContextWindow - promptTokens - reservedResponseTokens - safetyBuffer;
    if (availableMemoryBudget < 0) {
      availableMemoryBudget = 0;
    }

    let remainingWindowCapacity = maxContextWindow - promptTokens;
    if (remainingWindowCapacity < 0) {
      remainingWindowCapacity = 0;
    }

    const totalConsumed = promptTokens + reservedResponseTokens + safetyBuffer;
    const budgetUtilization = Math.min(100, Math.round((totalConsumed / maxContextWindow) * 10000) / 100);

    let allocationState: 'Healthy' | 'Warning' | 'Critical' = 'Healthy';
    if (budgetUtilization >= 95) {
      allocationState = 'Critical';
    } else if (budgetUtilization > 75) {
      allocationState = 'Warning';
    }

    return {
      promptTokens,
      availableMemoryBudget,
      reservedResponseTokens,
      safetyBuffer,
      remainingWindowCapacity,
      budgetUtilization,
      allocationState
    };
  }
}

