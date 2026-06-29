import { Memory } from './types';

export class ImportanceScorer {
  /**
   * Calculates dynamic importance score for a list of memories.
   * Modifies each memory's importanceScore in-place or returns a new array.
   */
  public static calculateScores(memories: Memory[]): Memory[] {
    if (memories.length === 0) return [];

    // Find the latest timestamp to measure relative recency
    const timestamps = memories.map(m => m.timestamp);
    const newestTime = Math.max(...timestamps);
    const oldestTime = Math.min(...timestamps);
    const timeSpan = newestTime - oldestTime || 1;

    return memories.map(memory => {
      // 1. Immutable memories are always score 100
      if (memory.type === 'immutable') {
        memory.importanceScore = 100;
        return memory;
      }

      // 2. Base weight by type
      let score = 0;
      switch (memory.type) {
        case 'persistent':
          score += 55;
          break;
        case 'session':
          score += 35;
          break;
        case 'ephemeral':
          score += 10;
          break;
      }

      // 3. Pinning adjustment (adds 20 points, cap at 98 for non-immutable)
      if (memory.pinned) {
        score += 25;
      }

      // 4. Frequency of reference (+2 points per reference, capped at +30)
const freqBonus = Math.min(memory.referenceCount * 2, 30);
score += freqBonus;

      // 5. Recency calculation (adds up to 12 points for newer memories)
      // Newer memories get more points, fading older ones
      const relativeAge = (memory.timestamp - oldestTime) / timeSpan; // 0 to 1
      const recencyBonus = relativeAge * 12;
      score += recencyBonus;

      // 6. Dependency count (connected memories) (+4 per connection, capped at +12)
      const depCount = memory.relatedMemories?.length || 0;
      memory.dependencyCount = depCount;
      const relationsBonus = Math.min(depCount * 4, 12);
      score += relationsBonus;

      // 7. Clamp the score between 0 and 99 (100 is reserved for Immutable)
      memory.importanceScore = Math.min(Math.max(Math.round(score), 0), 99);
      
      return memory;
    });
  }
}
