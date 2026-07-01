import { Memory } from "./types";

export class MemoryLifecycle {

  /**
   * Apply importance decay to memories based on age.
   */
  public static applyDecay(
    memories: Memory[]
  ): Memory[] {

    const now =
  Date.now() + (30 * 24 * 60 * 60 * 1000);

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

      const newImportance = Math.max(
        10,
        memory.importanceScore - decay
      );

      console.log(
        memory.content,
        "Importance:",
        memory.importanceScore,
        "Decay:",
        decay,
        "New:",
        newImportance
      );
      

      return {
        ...memory,
        importanceScore: newImportance,
        expired: newImportance <= 10
      };

    });

  }

  /**
   * Automatically archive expired memories.
   */
  public static archiveExpired(
    memories: Memory[]
  ): Memory[] {

    return memories.map(memory => {

        if (
            memory.expired &&
            !memory.archived
          ) {
          
            console.log(
              "Archiving:",
              memory.content
            );
          
            return {
              ...memory,
              archived: true
            };
          
          }

      return memory;

    });

  }


/**
 * Restore an archived memory.
 */
public static restoreMemory(
    memory: Memory
  ): Memory {
  
    return {
      ...memory,
      archived: false,
      expired: false,
      timestamp: Date.now()
    };
  
  }

}