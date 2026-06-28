import { pipeline } from "@huggingface/transformers";

export class EmbeddingEngine {
  private static extractor: any = null;

  /**
   * Load the embedding model once.
   */
  public static async initialize() {
    if (!this.extractor) {
      this.extractor = await pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2"
      );
    }
  }

  /**
   * Generate an embedding for a piece of text.
   */
  public static async generateEmbedding(
    text: string
  ): Promise<number[]> {

    await this.initialize();

    const output: any = await this.extractor(text, {
      pooling: "mean",
      normalize: true
    });

    return Array.from(output.data);
  }

  /**
   * Compute cosine similarity between two vectors.
   */
  public static cosineSimilarity(
    a: number[],
    b: number[]
  ): number {

    let dot = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }

    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
  }

  /**
   * Compare two pieces of text.
   */
  public static async similarity(
    textA: string,
    textB: string
  ): Promise<number> {

    const embeddingA =
      await this.generateEmbedding(textA);

    const embeddingB =
      await this.generateEmbedding(textB);

    return this.cosineSimilarity(
      embeddingA,
      embeddingB
    );
  }
}