import { Memory } from "./types";

export class MemoryLifecycle {

  /**
   * Apply importance decay to memories based on age.
   */
  public static applyDecay(
    memories: Memory[]
  ): Memory[] {
  
    const now = Date.now();
  
    return memories.map(memory => {
  
      // Immutable and pinned memories never decay
      if (
        memory.type === "immutable" ||
        memory.pinned
      ) {
        return memory;
      }
  
      // Days since last update
      const daysIdle =
        (now - memory.timestamp) /
        (1000 * 60 * 60 * 24);
  
      // Lose 1 importance per day
      const DECAY_PER_DAY = 1;
  
      const decay =
        Math.floor(daysIdle * DECAY_PER_DAY);
  
      return {
        ...memory,
        importanceScore: Math.max(
          10,
          memory.importanceScore - decay
        )
      };
  
    });
  
  }

  }