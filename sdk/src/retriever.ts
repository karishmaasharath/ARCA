import { Memory } from './types';
import { EmbeddingEngine } from './embedding';
import { Benchmark } from "./benchmark";

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
      const ranked = results
  .filter(item => item.overlap > 0)
  .sort((a, b) => b.overlap - a.overlap);

const retrieved = ranked
  .slice(0, limit)
  .map(item => item.memory);

// Expand with related memories
const expanded: Memory[] = [];
const visited = new Set<string>();
const queue: Memory[] = [...retrieved];

while (queue.length > 0 && expanded.length < limit) {

  const current = queue.shift()!;

  if (visited.has(current.id)) {
    continue;
  }

  visited.add(current.id);
  expanded.push(current);

  for (const relatedId of current.relatedMemories) {

    const related = memories.find(
      m => m.id === relatedId
    );

    if (
      related &&
      !visited.has(related.id)
    ) {
      queue.push(related);
    }
  }
}
const metrics = Benchmark.run(expanded);

console.log("ARCA Retrieval Benchmark");
console.table(metrics);
return expanded;
}
}
