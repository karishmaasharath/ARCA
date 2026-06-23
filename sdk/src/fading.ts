import { Memory } from './types';
import { ImportanceScorer } from './scorer';
import { estimateTokens } from './utils';

export class SemanticFadingEngine {
  /**
   * Evaluates memories against a token budget, splitting them into
   * 'active' (to be kept in context) and 'faded' (to be pruned).
   * 
   * Immutable and pinned memories are prioritized first.
   */
  public static fade(
    memories: Memory[],
    tokenBudget: number
  ): { active: Memory[]; faded: Memory[]; totalActiveTokens: number } {
    // 1. Re-calculate dynamic scores
    const scoredMemories = ImportanceScorer.calculateScores([...memories]);

    // 2. Separate Immutable and Pinned, which have absolute preservation priority
    const mustKeep: Memory[] = [];
    const candidates: Memory[] = [];

    for (const mem of scoredMemories) {
      if (mem.type === 'immutable' || mem.pinned) {
        mustKeep.push(mem);
      } else {
        candidates.push(mem);
      }
    }

    // Sort priority: Immutable and pinned first, then candidates by score descending
    // (If scores are equal, sort by newer timestamp first)
    candidates.sort((a, b) => {
      if (b.importanceScore !== a.importanceScore) {
        return b.importanceScore - a.importanceScore;
      }
      return b.timestamp - a.timestamp;
    });

    const active: Memory[] = [];
    const faded: Memory[] = [];
    let currentTokens = 0;

    // First, try to fit all must-keep memories
    for (const mem of mustKeep) {
      const tokens = estimateTokens(mem.content);
      // Even if must-keep exceeds budget, we are forced to keep Immutable/Pinned items
      active.push(mem);
      currentTokens += tokens;
    }

    // Now, fit candidates until the budget is filled
    for (const mem of candidates) {
      const tokens = estimateTokens(mem.content);
      if (currentTokens + tokens <= tokenBudget) {
        active.push(mem);
        currentTokens += tokens;
      } else {
        faded.push(mem);
      }
    }

    // Sort active memories chronologically to maintain coherence in the final prompt
    active.sort((a, b) => a.timestamp - b.timestamp);

    return {
      active,
      faded,
      totalActiveTokens: currentTokens
    };
  }
}
