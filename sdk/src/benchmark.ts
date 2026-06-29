import { Memory } from "./types";

export interface RetrievalBenchmark {
  totalRetrieved: number;
  averageImportance: number;
  averageReferenceCount: number;
  averageConfidence: number;
  averageEmbeddingSimilarity: number;
}

export class Benchmark {

  public static run(
    retrieved: Memory[],
    queryEmbedding?: number[]
  ): RetrievalBenchmark {

    const totalRetrieved = retrieved.length;

    const averageImportance =
      totalRetrieved === 0
        ? 0
        : retrieved.reduce(
            (sum, m) => sum + m.importanceScore,
            0
          ) / totalRetrieved;

    const averageReferenceCount =
      totalRetrieved === 0
        ? 0
        : retrieved.reduce(
            (sum, m) => sum + m.referenceCount,
            0
          ) / totalRetrieved;

    const averageConfidence =
      totalRetrieved === 0
        ? 0
        : retrieved.reduce(
            (sum, m) => sum + m.confidenceScore,
            0
          ) / totalRetrieved;

    return {
      totalRetrieved,
      averageImportance,
      averageReferenceCount,
      averageConfidence,
      averageEmbeddingSimilarity: 0
    };
  }

}