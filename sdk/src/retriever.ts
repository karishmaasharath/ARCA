import { Memory } from './types';

export class MemoryRetriever {

  public static retrieve(
    query: string,
    memories: Memory[],
    limit = 20
  ): Memory[] {

    const queryWords = query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3);

    const results = memories
      .map(memory => {

        const memoryWords = memory.content
          .toLowerCase()
          .split(/\s+/);

        // Base keyword relevance
const keywordScore = queryWords.filter(
    word => memoryWords.includes(word)
  ).length;
  
  // Priority bonus based on memory type
  let priorityBonus = 0;
  
  if (memory.type === 'immutable') {
    priorityBonus = 5;
  } else if (memory.type === 'persistent') {
    priorityBonus = 2;
  }
  
  // Existing dynamic scores
  const importanceBonus = memory.importanceScore / 20;
  const referenceBonus = Math.min(memory.referenceCount, 5);
  
  // Final hybrid retrieval score
  const overlap =
    keywordScore +
    priorityBonus +
    importanceBonus +
    referenceBonus;

        return {
          memory,
          overlap
        };

      })
      .filter(item => item.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, limit)
      .map(item => item.memory);

    return results;
  }
}