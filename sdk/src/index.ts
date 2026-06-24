import { Memory, MemoryType, ContextHealth, PlatformType, ValidationResult } from './types';
import { MemoryStore } from './store';
import { SemanticClassifier } from './classifier';
import { ImportanceScorer } from './scorer';
import { SemanticFadingEngine } from './fading';
import { TokenCompressor } from './compressor';
import { ValidationEngine } from './validator';
import { RepairEngine } from './repair';
import { AdaptiveTokenAllocator } from './allocator';
import { estimateTokens, generateId } from './utils';
import { MemoryRetriever } from './retriever';

export class ARCA {
  private store: MemoryStore;
  private classifier: SemanticClassifier;

  constructor() {
    this.store = new MemoryStore();
    this.classifier = new SemanticClassifier();
  }

  // Getters for store and classifier
  public getStore(): MemoryStore {
    return this.store;
  }

  public getClassifier(): SemanticClassifier {
    return this.classifier;
  }

  /**
   * Ingests a new message or constraint, classifies it, finds semantic relationships,
   * scores its importance, and stores it in IndexedDB.
   */
  public async ingest(
    content: string,
    options?: { type?: MemoryType; pinned?: boolean }
  ): Promise<Memory> {
    const memories = await this.store.getAll();
    
    // 1. Determine Type (Classify)
    let type: MemoryType = options?.type || 'ephemeral';
    let confidenceScore = 1.0;
    if (!options?.type) {
      const classification = await this.classifier.classify(content);
      type = classification.type;
      confidenceScore = classification.confidence;
    }

    // 2. Determine semantic relationships with existing memories
    const relatedMemories: string[] = [];
    const textTokens = content.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    
    for (const mem of memories) {
      const memTokens = mem.content.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const intersection = textTokens.filter(t => memTokens.includes(t));
      
      // Heuristic overlap check - link if they share 3 or more distinctive words
      if (intersection.length >= 3) {
        relatedMemories.push(mem.id);
        
        // Bidirectional linking
        if (!mem.relatedMemories.includes(mem.id)) {
          mem.relatedMemories.push(mem.id);
          await this.store.save(mem);
        }
      }
    }

    // 3. Construct new Memory
    const newMemory: Memory = {
      id: generateId(),
      content: content.trim(),
      type,
      timestamp: Date.now(),
      importanceScore: 0, // calculated next
      referenceCount: 0,
      relatedMemories,
      confidenceScore,
      pinned: options?.pinned || false
    };

    // 4. Save and calculate dynamic scores for all memories
    await this.store.save(newMemory);
    await this.recalculateScores();

    // Fetch the stored version with updated scores
    const freshMemories = await this.store.getAll();
    return freshMemories.find(m => m.id === newMemory.id) || newMemory;
  }

  /**
   * Triggers score recalculation for all saved memories.
   */
  public async recalculateScores(): Promise<void> {
    const memories = await this.store.getAll();
    const updated = ImportanceScorer.calculateScores(memories);
    await this.store.saveAll(updated);
  }

  /**
   * Promotes a memory's type (e.g. Ephemeral -> Session).
   */
  public async promote(id: string, type: MemoryType): Promise<void> {
    const memories = await this.store.getAll();
    const idx = memories.findIndex(m => m.id === id);
    if (idx >= 0) {
      memories[idx].type = type;
      if (type === 'immutable') {
        memories[idx].importanceScore = 100;
      }
      await this.store.saveAll(memories);
      await this.recalculateScores();
    }
  }

  /**
   * Pins or unpins a memory.
   */
  public async pin(id: string, pinned: boolean): Promise<void> {
    const memories = await this.store.getAll();
    const idx = memories.findIndex(m => m.id === id);
    if (idx >= 0) {
      memories[idx].pinned = pinned;
      await this.store.saveAll(memories);
      await this.recalculateScores();
    }
  }

  /**
   * Deletes a memory and removes any relations pointing to it.
   */
  public async delete(id: string): Promise<void> {
    const memories = await this.store.getAll();
    // Remove references
    const updated = memories.map(m => {
      if (m.relatedMemories.includes(id)) {
        return {
          ...m,
          relatedMemories: m.relatedMemories.filter(rId => rId !== id)
        };
      }
      return m;
    }).filter(m => m.id !== id);

    await this.store.saveAll(updated);
    await this.recalculateScores();
  }

  /**
   * The core Context Governance pipeline.
   * Compiles memories into an optimized prompt segment under the platform budget.
   */
  public async optimize(
    newPrompt: string,
    platformName?: PlatformType
  ): Promise<{
    optimizedPrompt: string;
    metrics: ContextHealth;
    activeMemories: Memory[];
    fadedMemories: Memory[];
  }> {
    const platform = platformName || AdaptiveTokenAllocator.detectPlatform();
    const config = AdaptiveTokenAllocator.getConfig(platform);
    
    // Get all memories
    const allMemories = await this.store.getAll();

    // Retrieve memories with keyword overlap (limit raised to 20 to find relevant ones)
    const retrievedMemories = MemoryRetriever.retrieve(
      newPrompt,
      allMemories,
      20
    );

    // Always include all immutable and pinned memories to ensure project rules/facts are never lost
    const memories = [...retrievedMemories];
    for (const mem of allMemories) {
      if ((mem.type === 'immutable' || mem.pinned) && !memories.some(m => m.id === mem.id)) {
        memories.push(mem);
      }
    }

    // Increment references for existing memories matching content keywords
    const promptKeywords = newPrompt.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    for (const mem of memories) {
      const matchWords = mem.content.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const overlap = promptKeywords.filter(w => matchWords.includes(w));
      if (overlap.length >= 2) {
        mem.referenceCount += 1;
        await this.store.save(mem);
      }
    }

    // Re-score based on new frequencies
    await this.recalculateScores();
    
    // Fetch fresh copies with updated scores from store to pass to fading engine
    const allFreshMemories = await this.store.getAll();
    const freshMemories = memories.map(m => allFreshMemories.find(fm => fm.id === m.id) || m);

    // 1. Run Semantic Fading under the platform memory budget
    // Determine the max memories allowed based on the platform's compression strategy
    let maxMemories = 6;
    if (config.compressionStrategy === 'minimal') {
      maxMemories = 10;
    } else if (config.compressionStrategy === 'aggressive') {
      maxMemories = 4;
    }

    const { active, faded, totalActiveTokens } = SemanticFadingEngine.fade(freshMemories, maxMemories);
    const uniqueActive = active.filter(
      (memory, index, self) =>
        index === self.findIndex(
          m => m.content.trim().toLowerCase() ===
               memory.content.trim().toLowerCase()
        )
    );

    // 2. Compress the active memory set
    let originalActiveContent = active.map(m => m.content).join('\n\n');
    
    // Fix: originalTotalTokens must be calculated before fading to accurately measure token savings!
    const totalOriginalMemoriesTokens = freshMemories.reduce((sum, mem) => sum + estimateTokens(mem.content), 0);
    const newPromptTokens = estimateTokens(newPrompt);
    let originalTotalTokens = newPromptTokens + totalOriginalMemoriesTokens;

    // Apply strategy: minimal, moderate, aggressive, or structural
    let strategy: 'minimal' | 'moderate' | 'aggressive' = 'moderate';
    if (config.compressionStrategy === 'minimal') strategy = 'minimal';
    else if (config.compressionStrategy === 'aggressive') strategy = 'aggressive';

    const compressionResult = TokenCompressor.compressMemories(uniqueActive, strategy);

    // Compile compressed memory block
    let compressedMemoryBlock = compressionResult.compressedMemories.map(m => m.content).join('\n\n');

    // 3. Validation & Repair Loop
    const pipelineResult = RepairEngine.runPipeline(
      originalActiveContent,
      (txt) => TokenCompressor.compressText(txt, strategy)
    );

    let finalMemoryBlock = pipelineResult.finalOutput;

    // Calculate final tokens
    const finalMemoryTokens = estimateTokens(finalMemoryBlock);
    const totalCompressedTokens = newPromptTokens + finalMemoryTokens;
    const tokenSavings = originalTotalTokens - totalCompressedTokens;
    const tokenSavingsRate = originalTotalTokens > 0 ? (tokenSavings / originalTotalTokens) * 100 : 0;

    // Compile rules and constraints for health scoring
    const ruleValidation = ValidationEngine.validate(originalActiveContent, finalMemoryBlock);
    const totalOriginalRulesCount = originalActiveContent.split(/[.!?\n]+/).filter(s => {
      const l = s.toLowerCase();
      return ['never', 'do not', 'must', 'avoid', 'rule'].some(k => l.includes(k));
    }).length;

    const rulePreservationRate = totalOriginalRulesCount > 0 
      ? Math.max(0, Math.round(((totalOriginalRulesCount - ruleValidation.missingRules.length) / totalOriginalRulesCount) * 100))
      : 100;

    // Health score: combines rule preservation and fit rate
    // If we preserved 100% of rules, health is high. Deduct if critical rules were broken.
    const ruleDeduction = ruleValidation.missingRules.length * 20;
    const healthScore = Math.max(0, Math.min(100, 100 - ruleDeduction));

    const metrics: ContextHealth = {
      healthScore,
      rulePreservationRate,
      tokenSavingsRate: Math.max(0, Math.round(tokenSavingsRate)),
      originalTokens: originalTotalTokens,
      compressedTokens: totalCompressedTokens
    };

    // Construct final optimized output prompt
    // We prepend the compressed memory context, and append the user's active prompt
    const optimizedPrompt = finalMemoryBlock.trim() !== ''
      ? `[ARCA Context Memory]\n${finalMemoryBlock}\n\n[Active Session Prompt]\n${newPrompt}`
      : newPrompt;

    return {
      optimizedPrompt,
      metrics,
      activeMemories: active,
      fadedMemories: faded
    };
  }
}
export * from './types';
export * from './store';
export * from './classifier';
export * from './scorer';
export * from './fading';
export * from './compressor';
export * from './validator';
export * from './repair';
export * from './allocator';
export * from './utils';
export * from './retriever';