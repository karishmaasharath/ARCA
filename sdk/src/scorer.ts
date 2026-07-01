import { Memory } from './types';

export class ImportanceScorer {
  /**
   * Calculates dynamic importance score for a list of memories.
   * Modifies each memory's importanceScore in-place or returns a new array.
   */
  public static calculateScores(memories: Memory[]): Memory[] {
    if (memories.length === 0) return [];
  
    const timestamps = memories.map(m => m.timestamp);
    const newestTime = Math.max(...timestamps);
    const oldestTime = Math.min(...timestamps);
    const timeSpan = newestTime - oldestTime || 1;
  
    return memories.map(memory => {
  
      if (memory.type === "immutable") {
        memory.importanceScore = 100;
        return memory;
      }
  
      let targetScore = 0;
  
      switch (memory.type) {
        case "persistent":
          targetScore += 55;
          break;
  
        case "session":
          targetScore += 35;
          break;
  
        case "ephemeral":
          targetScore += 10;
          break;
      }
  
      if (memory.pinned) {
        targetScore += 25;
      }
  
      targetScore += Math.min(
        memory.referenceCount * 2,
        30
      );
  
      const relativeAge =
        (memory.timestamp - oldestTime) / timeSpan;
  
      targetScore += relativeAge * 12;
  
      const depCount =
        memory.relatedMemories?.length || 0;
  
      memory.dependencyCount = depCount;
  
      targetScore += Math.min(
        depCount * 4,
        12
      );
  
      targetScore = Math.min(
        Math.max(Math.round(targetScore), 0),
        99
      );
  
      // Never reduce an already-decayed score.
      memory.importanceScore = Math.max(
        memory.importanceScore,
        targetScore
      );
  
      return memory;
  
    });
  
  }
}
