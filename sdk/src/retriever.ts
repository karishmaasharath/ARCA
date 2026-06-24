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

        let overlap = queryWords.filter(
          word => memoryWords.includes(word)
        ).length;

        // Boost important memory types
        if (memory.type === 'immutable') {
          overlap += 5;
        }

        if (memory.type === 'persistent') {
          overlap += 2;
        }

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