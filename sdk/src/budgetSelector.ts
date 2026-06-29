import { Memory, BudgetSelectionResult } from './types';
import { estimateTokens } from './utils';

export class BudgetSelector {
  /**
   * Selects the optimal subset of retrieved memories that fit within the available memory budget.
   */
  public static select(
    memories: Memory[],
    availableMemoryBudget: number
  ): BudgetSelectionResult {
    // Clone the input array to avoid mutating it
    const sortedMemories = [...memories];

    // Sort memories by official priority fields only:
    // 1. Importance score (highest first)
    // 2. Reference count (highest first)
    // 3. Confidence score (highest first)
    // 4. Newest timestamp as final tie-breaker (highest first)
    sortedMemories.sort((a, b) => {
      const importanceA = a.importanceScore ?? 0;
      const importanceB = b.importanceScore ?? 0;
      if (importanceA !== importanceB) {
        return importanceB - importanceA;
      }

      const refA = a.referenceCount ?? 0;
      const refB = b.referenceCount ?? 0;
      if (refA !== refB) {
        return refB - refA;
      }

      const confA = a.confidenceScore ?? 0;
      const confB = b.confidenceScore ?? 0;
      if (confA !== confB) {
        return confB - confA;
      }

      const timeA = a.timestamp ?? 0;
      const timeB = b.timestamp ?? 0;
      return timeB - timeA;
    });

    const selectedMemories: Memory[] = [];
    const skippedMemories: Memory[] = [];
    let usedBudget = 0;

    for (const mem of sortedMemories) {
      const tokens = estimateTokens(mem.content);
      if (usedBudget + tokens <= availableMemoryBudget) {
        selectedMemories.push(mem);
        usedBudget += tokens;
      } else {
        skippedMemories.push(mem);
      }
    }

    // Calculate token metrics
    const selectedTokens = usedBudget;
    const skippedTokens = skippedMemories.reduce(
      (sum, mem) => sum + estimateTokens(mem.content),
      0
    );
    const remainingBudget = Math.max(0, availableMemoryBudget - usedBudget);

    return {
      selectedMemories,
      skippedMemories,
      usedBudget,
      remainingBudget,
      selectedTokens,
      skippedTokens
    };
  }
}
