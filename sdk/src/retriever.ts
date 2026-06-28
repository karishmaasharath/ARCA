import { Memory } from './types';
import { EmbeddingEngine } from './embedding';

export class MemoryRetriever {

    public static async retrieve(
    query: string,
    memories: Memory[],
    limit = 20
): Promise<Memory[]> {

    const queryWords = query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3);

      // Generate embedding for the query once
const queryEmbedding =
await EmbeddingEngine.generateEmbedding(query);

    const results = memories
      .map(memory => {

        const memoryWords = memory.content
          .toLowerCase()
          .split(/\s+/);

          let semanticScore = 0;

if (memory.embedding) {
  semanticScore =
    EmbeddingEngine.cosineSimilarity(
      queryEmbedding,
      memory.embedding
    );
}
console.log(
    memory.content,
    "Has embedding:",
    !!memory.embedding,
    "Semantic:",
    semanticScore.toFixed(3)
  );
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
  (keywordScore * 2) +
  (semanticScore * 10) +
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