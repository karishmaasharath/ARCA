import { Memory, MemoryType, ContextHealth, PlatformType, ValidationResult, ContextAllocation, MemoryExport, ImportResult } from './types';
import { MemoryStore } from './store';
import { SemanticClassifier, extractEntities, segmentText, isFiller, extractMemoryCandidate, calculateConfidence, Entity } from './classifier';
import { ImportanceScorer } from './scorer';
import { SemanticFadingEngine } from './fading';
import { TokenCompressor } from './compressor';
import { ValidationEngine } from './validator';
import { RepairEngine } from './repair';
import { AdaptiveTokenAllocator, ContextAllocator } from './allocator';
import { estimateTokens, generateId, SDK_VERSION } from './utils';
import { MemoryRetriever } from './retriever';
import { EmbeddingEngine } from './embedding';
import { MemoryLifecycle } from "./lifecycle";

export class ARCA {
  private store: MemoryStore;
  private classifier: SemanticClassifier;
  private confidenceThreshold: number;

  constructor(options?: { confidenceThreshold?: number }) {
    this.store = new MemoryStore();
    this.classifier = new SemanticClassifier();
    this.confidenceThreshold = options?.confidenceThreshold ?? 70;
  }

  public getConfidenceThreshold(): number {
    return this.confidenceThreshold;
  }

  public setConfidenceThreshold(threshold: number): void {
    this.confidenceThreshold = threshold;
  }

  /**
 * Updates SDK configuration.
 */
public configure(options: {
  confidenceThreshold?: number;
}): void {

  if (options.confidenceThreshold !== undefined) {
    this.confidenceThreshold = options.confidenceThreshold;
  }

}

  // Getters for store and classifier
  public getStore(): MemoryStore {
    return this.store;
  }

  public getClassifier(): SemanticClassifier {
    return this.classifier;
  }

  private isConversationalFiller(text: string): boolean {
    const trimmed = text.trim().toLowerCase();
    if (!trimmed) return true;

    // Remove basic punctuation to check word count and matches
    const cleanText = trimmed.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim();
    const words = cleanText.split(/\s+/).filter(w => w.length > 0);

    // If it's extremely short (e.g. 1-2 words) check against a list of filler/chitchat words
    if (words.length <= 2) {
      const fillerWords = [
        'hello', 'hi', 'hey', 'thanks', 'thank', 'ok', 'okay', 'cool', 'awesome', 'great', 
        'yes', 'no', 'sure', 'fine', 'perfect', 'greetings', 'yo', 'welcome', 'bye', 
        'goodbye', 'nice', 'good', 'well', 'done', 'indeed', 'totally', 'absolutely'
      ];
      if (words.every(w => fillerWords.includes(w))) {
        return true;
      }
    }

    // Common filler/small talk regex patterns
    const fillerPatterns = [
      /^(hello|hi|hey|greetings|howdy|yo|good\s+morning|good\s+afternoon|good\s+evening)\b/i,
      /\b(how\s+are\s+you|how\s+is\s+it\s+going|how's\s+it\s+going|what's\s+up|whats\s+up|how\s+are\s+things)\b/i,
      /\b(nice\s+work|good\s+job|great\s+job|well\s+done|thank\s+you|thanks|awesome|perfect|cool)\b/i,
      /\b(hope\s+you\s+are\s+doing\s+well|hope\s+you're\s+doing\s+well|let's\s+start|let's\s+get\s+started)\b/i,
      /^(nice\s+work|good\s+work|keep\s+it\s+up|keep\s+up\s+the\s+good\s+work)\b/i
    ];

    for (const pattern of fillerPatterns) {
      if (pattern.test(trimmed)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Ingests a new message or constraint, classifies it, finds semantic relationships,
   * scores its importance, and stores it in IndexedDB.
   */
 private async findSemanticallySimilarMemory(
  content: string,
  memories: Memory[],
  entities: Entity[]
): Promise<Memory | null> {

  const normalize = (text: string) =>
    text
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const normalizedContent = normalize(content);

  // Exact duplicate
  const exact = memories.find(
    m => normalize(m.content) === normalizedContent
  );

  if (exact) {
    return exact;
  }

  const candidateEmbedding =
  await EmbeddingEngine.generateEmbedding(
    content.trim()
  );
  const textTokens = content
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2);

  let bestMemory: Memory | null = null;
  let bestScore = 0;

  for (const mem of memories) {

    // -----------------------------
    // Embedding Score
    // -----------------------------
    let embeddingScore = 0;

    if (candidateEmbedding) {

      const memEmbedding = mem.embedding;

      if (candidateEmbedding && memEmbedding) {
        embeddingScore =
          this.classifier.cosineSimilarity(
            candidateEmbedding,
            memEmbedding
          );
      }
    }

    // -----------------------------
    // Lexical Score (Jaccard)
    // -----------------------------
    const memTokens = mem.content
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 2);

    const setA = new Set(textTokens);
    const setB = new Set(memTokens);

    const intersection =
      [...setA].filter(x => setB.has(x)).length;

    const union =
      new Set([...setA, ...setB]).size;

    const lexicalScore =
      union === 0 ? 0 : intersection / union;

    // -----------------------------
    // Entity Score
    // -----------------------------
    const memEntities =
      extractEntities(mem.content);

    const sharedEntities =
      entities.filter(entity =>
        memEntities.some(
          m =>
            m.name.toLowerCase() ===
            entity.name.toLowerCase()
        )
      );

    const entityScore =
      entities.length === 0
        ? 0
        : sharedEntities.length / entities.length;

    // -----------------------------
    // Hybrid Score
    // -----------------------------
    const finalScore =
      (embeddingScore * 0.6) +
      (entityScore * 0.2) +
      (lexicalScore * 0.2);

    if (finalScore > bestScore) {
      bestScore = finalScore;
      bestMemory = mem;
    }
  }

  if (bestScore >= 0.75) {
    return bestMemory;
  }

  return null;
}
  public async ingest(
    content: string,
    options?: { type?: MemoryType; pinned?: boolean; confidenceThreshold?: number }
  ): Promise<Memory | null> {
    // Discard conversational filler immediately
    if (isFiller(content)) {
      return null;
    }

    const memories = await this.store.getAll();
    const entities = extractEntities(content);

    // 1. Check for duplicate semantically similar memory
    const duplicate = await this.findSemanticallySimilarMemory(content, memories, entities);
    if (duplicate) {
      duplicate.referenceCount =
  (duplicate.referenceCount || 0) + 1;

// Refresh last access time
duplicate.timestamp = Date.now();
      // Reinforce importance
      if (duplicate.confidenceScore < 100) {
        duplicate.confidenceScore = Math.min(100, duplicate.confidenceScore + 5);
      }
      if (options?.pinned !== undefined) {
        duplicate.pinned = options.pinned;
      }
      if (options?.type) {
        duplicate.type = options.type;
      }
      await this.store.save(duplicate);
      await this.recalculateScores();
      const freshMemories = await this.store.getAll();
      return freshMemories.find(m => m.id === duplicate.id) || duplicate;
    }

    // 2. Determine Type & Confidence Score
    let type: MemoryType = options?.type || 'ephemeral';
    let confidenceScore = 100;
    let confidenceReason = 'Explicitly specified type.';

    if (!options?.type) {
      const classification = await this.classifier.classify(content, entities);
      type = classification.type;
      const confResult = calculateConfidence(content, type, entities);
      confidenceScore = confResult.score;
      confidenceReason = confResult.reason;
    } else {
      const confResult = calculateConfidence(content, type, entities);
      confidenceScore = confResult.score;
      confidenceReason = confResult.reason;
    }

    // 3. Confidence Threshold Check
    const threshold = options?.confidenceThreshold ?? this.confidenceThreshold;
    if (confidenceScore < threshold) {
      return null;
    }

    const relatedMemories: string[] = [];

const candidateEmbedding =
  await EmbeddingEngine.generateEmbedding(
    content.trim()
  );

for (const mem of memories) {

  if (!mem.embedding) {
    continue;
  }

  const similarity =
    EmbeddingEngine.cosineSimilarity(
      candidateEmbedding,
      mem.embedding
    );

  if (similarity >= 0.65) {

    if (!relatedMemories.includes(mem.id)) {
      relatedMemories.push(mem.id);
    }

  }

}
const embedding =
  await EmbeddingEngine.generateEmbedding(
    content.trim()
  );
    // 5. Construct new Memory
    const newMemory: Memory = {
      id: generateId(),
      content: content.trim(),
      type,
      timestamp: Date.now(),
      importanceScore: 0, // calculated next
      referenceCount: 0,
      expired: false,
      archived: false,
      relatedMemories,
      confidenceScore,
      confidenceReason,
      embedding,
      pinned: options?.pinned || false
    };

    // 6. Save and calculate dynamic scores for all memories
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

    const memories =
      await this.store.getAll();
  
    const scored =
      ImportanceScorer.calculateScores(memories);
  
    const decayed =
      MemoryLifecycle.applyDecay(scored);
  
      const archived =
      MemoryLifecycle.archiveExpired(decayed);
    
    console.log(
      archived.filter(m => m.archived)
    );
    
    await this.store.saveAll(archived);
  
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
 * Restores an archived memory.
 */
public async restore(id: string): Promise<void> {
  const memories = await this.store.getAll();

  const idx = memories.findIndex(
    m => m.id === id
  );

  if (idx >= 0) {

    memories[idx] =
      MemoryLifecycle.restoreMemory(
        memories[idx]
      );

    await this.store.saveAll(memories);
    await this.recalculateScores();

  }

}

/**
 * Archives a memory manually.
 */
public async archive(id: string): Promise<void> {

  const memories = await this.store.getAll();

  const idx = memories.findIndex(
    m => m.id === id
  );

  if (idx >= 0) {

    memories[idx] = {
      ...memories[idx],
      archived: true
    };

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
 * Clears all stored memories.
 */
public async clear(): Promise<void> {
  await this.store.clear();
}

  /**
   * The core Context Governance pipeline.
   * Compiles memories into an optimized prompt segment under the platform budget.
   */
  public async optimize(
    newPrompt: string,
    platformName?: PlatformType,
    options?: {
      maxContextWindow?: number;
      reservedResponseTokens?: number;
      safetyBuffer?: number;
    }
  ): Promise<{
    optimizedPrompt: string;
    metrics: ContextHealth;
    activeMemories: Memory[];
    fadedMemories: Memory[];
    allocation: ContextAllocation;
  }> {
    const platform = platformName || AdaptiveTokenAllocator.detectPlatform();
    const config = AdaptiveTokenAllocator.getConfig(platform);

    const maxContextWindow = options?.maxContextWindow ?? config.maxTokens;
    const allocation = ContextAllocator.allocate(newPrompt, maxContextWindow, options);
    
    // --- Automatic Memory Extraction ---
    const segments = segmentText(newPrompt);
    for (const segment of segments) {
      if (isFiller(segment)) {
        continue;
      }

      const entities = extractEntities(segment);
      const candidate = extractMemoryCandidate(segment, entities);

      if (isFiller(candidate)) {
        continue;
      }

      await this.ingest(candidate);
    }

    // Get all memories
    const allMemories = await this.store.getAll();

    // Retrieve memories with keyword overlap (limit raised to 20 to find relevant ones)
    const retrievedMemories = await MemoryRetriever.retrieve(
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
// --- Automatic Memory Extraction ---

return {
  optimizedPrompt,
  metrics,
  activeMemories: active,
  fadedMemories: faded,
  allocation
};
  }

  /**
   * Export all stored memories as a serialized JSON string.
   */
  public async exportMemories(): Promise<string> {
    const memories = await this.store.getAll();
    const exportData: MemoryExport = {
      version: "1.0.0",
      arcaVersion: SDK_VERSION,
      exportedAt: new Date().toISOString(),
      memories
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import memories from a serialized JSON string.
   * Merges imported memories with existing memories without duplicates.
   */
  public async importMemories(json: string): Promise<ImportResult> {
    let parsed: any;
    try {
      parsed = JSON.parse(json);
    } catch (e: any) {
      throw new Error(`Invalid JSON: ${e.message || e}`);
    }

    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error("Invalid export structure: Root must be a JSON object.");
    }

    if (!parsed.version) {
      throw new Error("Invalid export structure: Missing schema version.");
    }

    if (parsed.version !== "1.0.0") {
      throw new Error(`Unsupported export version: "${parsed.version}". Only version "1.0.0" is supported.`);
    }

    if (!parsed.arcaVersion) {
      throw new Error("Invalid export structure: Missing arcaVersion.");
    }

    if (!Array.isArray(parsed.memories)) {
      throw new Error("Invalid export structure: memories field is missing or not an array.");
    }

    const existingMemories = await this.store.getAll();
    const existingIds = new Set(existingMemories.map(m => m.id));

    let importedCount = 0;
    let skippedDuplicatesCount = 0;
    let skippedInvalidCount = 0;
    const warnings: string[] = [];

    const validTypes = ['immutable', 'persistent', 'session', 'ephemeral'];

    for (let i = 0; i < parsed.memories.length; i++) {
      const mem = parsed.memories[i];
      const identityStr = mem && typeof mem.id === 'string' ? `ID "${mem.id}"` : `index ${i}`;

      if (typeof mem !== 'object' || mem === null) {
        skippedInvalidCount++;
        warnings.push(`Skipped invalid entry at index ${i}: entry is not an object.`);
        continue;
      }

      // Check required fields
      if (typeof mem.id !== 'string' || mem.id.trim() === '') {
        skippedInvalidCount++;
        warnings.push(`Skipped invalid entry at ${identityStr}: missing or empty 'id' field.`);
        continue;
      }

      if (typeof mem.content !== 'string') {
        skippedInvalidCount++;
        warnings.push(`Skipped invalid entry at ${identityStr}: 'content' field must be a string.`);
        continue;
      }

      if (typeof mem.type !== 'string' || !validTypes.includes(mem.type)) {
        skippedInvalidCount++;
        warnings.push(`Skipped invalid entry at ${identityStr}: 'type' field must be one of ${validTypes.join(', ')}.`);
        continue;
      }

      if (typeof mem.timestamp !== 'number') {
        skippedInvalidCount++;
        warnings.push(`Skipped invalid entry at ${identityStr}: 'timestamp' field must be a number.`);
        continue;
      }

      if (typeof mem.importanceScore !== 'number') {
        skippedInvalidCount++;
        warnings.push(`Skipped invalid entry at ${identityStr}: 'importanceScore' field must be a number.`);
        continue;
      }

      if (typeof mem.referenceCount !== 'number') {
        skippedInvalidCount++;
        warnings.push(`Skipped invalid entry at ${identityStr}: 'referenceCount' field must be a number.`);
        continue;
      }

      if (!Array.isArray(mem.relatedMemories)) {
        skippedInvalidCount++;
        warnings.push(`Skipped invalid entry at ${identityStr}: 'relatedMemories' field must be an array.`);
        continue;
      }

      if (typeof mem.expired !== 'boolean') {
        skippedInvalidCount++;
        warnings.push(`Skipped invalid entry at ${identityStr}: 'expired' field must be a boolean.`);
        continue;
      }

      if (typeof mem.archived !== 'boolean') {
        skippedInvalidCount++;
        warnings.push(`Skipped invalid entry at ${identityStr}: 'archived' field must be a boolean.`);
        continue;
      }

      if (typeof mem.pinned !== 'boolean') {
        skippedInvalidCount++;
        warnings.push(`Skipped invalid entry at ${identityStr}: 'pinned' field must be a boolean.`);
        continue;
      }

      // Check for duplicate IDs
      if (existingIds.has(mem.id)) {
        skippedDuplicatesCount++;
        warnings.push(`Skipped duplicate entry at ${identityStr}: memory ID already exists in the database.`);
        continue;
      }

      // Valid and non-duplicate. Import!
      try {
        const memoryToSave = { ...mem };
        
        // Regenerate embedding only if required and not present
        if (!memoryToSave.embedding) {
          memoryToSave.embedding = await EmbeddingEngine.generateEmbedding(memoryToSave.content);
        }

        await this.store.save(memoryToSave as Memory);
        importedCount++;
      } catch (err: any) {
        skippedInvalidCount++;
        warnings.push(`Failed to save valid memory entry at ${identityStr}: ${err.message || err}`);
      }
    }

    if (importedCount > 0) {
      await this.recalculateScores();
    }

    return {
      success: true,
      imported: importedCount,
      skippedDuplicates: skippedDuplicatesCount,
      skippedInvalid: skippedInvalidCount,
      warnings
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
export * from './migrations';