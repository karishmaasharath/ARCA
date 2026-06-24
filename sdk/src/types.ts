export type MemoryType = 'immutable' | 'persistent' | 'session' | 'ephemeral';

export interface Memory {
  id: string;
  content: string;
  type: MemoryType;
  timestamp: number;
  importanceScore: number; // 0 - 100
  referenceCount: number;
  relatedMemories: string[]; // IDs of related memories
  confidenceScore: number;   // 0.0 - 1.0
  pinned: boolean;
  dependencyCount?: number;
  fadingScore?: number;
  explanation?: string;
}

export interface ContextHealth {
  healthScore: number;        // 0 - 100
  rulePreservationRate: number; // 0 - 100
  tokenSavingsRate: number;    // 0 - 100
  originalTokens: number;
  compressedTokens: number;
}

export type PlatformType = 'chatgpt' | 'claude' | 'gemini' | 'local';

export interface PlatformConfig {
  maxTokens: number;
  compressionStrategy: 'minimal' | 'moderate' | 'aggressive' | 'structural';
}

export interface ValidationResult {
  isValid: boolean;
  missingRules: string[];
  missingEntities: string[];
}
