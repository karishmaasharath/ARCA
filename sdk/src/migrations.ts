import { MemoryStore } from "./store";
import { EmbeddingEngine } from "./embedding";

export class MemoryMigrations {

  /**
   * Generate embeddings for memories created
   * before semantic retrieval existed.
   */
  public static async backfillEmbeddings(
    store: MemoryStore
  ): Promise<void> {

    const memories = await store.getAll();

    let updated = 0;

    for (const memory of memories) {

      if (!memory.embedding) {

        memory.embedding =
          await EmbeddingEngine.generateEmbedding(
            memory.content
          );

        await store.save(memory);

        updated++;

        console.log(
          "Generated embedding:",
          memory.content
        );
      }
    }

    console.log(
      `Backfilled ${updated} memories.`
    );
  }
}