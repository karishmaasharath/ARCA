export type MemoryType = 'immutable' | 'persistent' | 'session' | 'ephemeral';

export interface Memory {
  id: string;
  content: string;
  type: MemoryType;
  timestamp: number;
  importanceScore: number; // 0 - 100
  referenceCount: number;
  relatedMemories: string[]; // IDs of related memories
  expired: boolean;
  archived: boolean;
  confidenceScore: number;   // 0 - 100
  confidenceReason?: string;
  neverForget?: boolean;
neverCompress?: boolean;
expireAfter?: number;
priorityOverride?: number;
  embedding?: number[];
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

export type AllocationState = 'Healthy' | 'Warning' | 'Critical';

export interface ContextAllocation {
  promptTokens: number;
  availableMemoryBudget: number;
  reservedResponseTokens: number;
  safetyBuffer: number;
  remainingWindowCapacity: number;
  budgetUtilization: number;
  allocationState: AllocationState;
}

export interface BudgetSelectionResult {
  selectedMemories: Memory[];
  skippedMemories: Memory[];
  usedBudget: number;
  remainingBudget: number;
  selectedTokens: number;
  skippedTokens: number;
}

export interface MemoryExport {
  version: string;      // Export schema version (e.g., "1.0.0")
  arcaVersion: string;  // ARCA SDK version (e.g., "1.0.0")
  exportedAt: string;   // ISO timestamp string
  memories: Memory[];
}

export interface ImportResult {
  success: boolean;
  imported: number;
  skippedDuplicates: number;
  skippedInvalid: number;
  warnings: string[];
}
