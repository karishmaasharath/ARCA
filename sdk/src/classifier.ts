import { MemoryType } from './types';

// Anchor phrases representing the 4 semantic tiers
const ANCHORS: Record<MemoryType, string[]> = {
  immutable: [
    "Never use Firebase",
    "Do not use external libraries",
    "Must follow GDPR compliance guidelines",
    "Rule: always validate input parameters",
    "Strict restriction: avoid third party hosting",
    "Ensure all user data is encrypted",
    "Do not write custom sorting algorithms",
    "Under no circumstances should API keys be checked into version control"
  ],
  persistent: [
    "The backend is built with FastAPI and Python",
    "We are using PostgreSQL for our main database",
    "Project architecture uses clean code principles",
    "The app uses React 18, Vite, and Tailwind CSS",
    "State is managed using Redux Toolkit",
    "Deployment is handled via Docker and AWS ECS",
    "User authentication is handled via JWT tokens"
  ],
  session: [
    "Build the dashboard login page component",
    "Add a new REST API endpoint for user profile retrieval",
    "Implement Framer Motion animations for the sidebar",
    "Fix the layout shift issue on mobile responsive header",
    "Create a mock dataset for the charting engine",
    "Write unit tests for the authentication reducer",
    "Refactor the memory store class to support clear method"
  ],
  ephemeral: [
    "Hello there! How can I help you?",
    "Thanks for the detailed explanation",
    "That is awesome, thank you so much",
    "Good morning, let us start",
    "Yes, that makes sense, let us do that",
    "Okay, cool, I will take a look at it now",
    "Hi, I have a quick question about this setup"
  ]
};

export class SemanticClassifier {
  private pipelineInstance: any = null;
  private isModelLoading = false;
  private isModelReady = false;
  private anchorEmbeddings: Record<MemoryType, number[][]> = {
    immutable: [],
    persistent: [],
    session: [],
    ephemeral: []
  };

  constructor() {
    this.initModel();
  }

  // Pre-load model asynchronously
  private async initModel() {
    if (typeof window === 'undefined') return;
    if (this.isModelLoading || this.isModelReady) return;

    this.isModelLoading = true;
    try {
      // Dynamic import of transformers to avoid blocking or bundle issues in non-wasm nodes
      const { pipeline } = await import('@huggingface/transformers');
      this.pipelineInstance = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        progress_callback: (info: any) => {
          if (info.status === 'ready') {
            console.log('Transformers.js embedding model ready');
          }
        }
      });

      // Pre-compute anchor embeddings to make active queries faster
      for (const type of Object.keys(ANCHORS) as MemoryType[]) {
        const typeEmbeds: number[][] = [];
        for (const anchor of ANCHORS[type]) {
          const res = await this.getTransformersEmbedding(anchor);
          if (res) typeEmbeds.push(res);
        }
        this.anchorEmbeddings[type] = typeEmbeds;
      }

      this.isModelReady = true;
    } catch (e) {
      console.warn('Transformers.js loading failed or not supported in this environment, using TF-IDF fallback:', e);
    } finally {
      this.isModelLoading = false;
    }
  }

  private async getTransformersEmbedding(text: string): Promise<number[] | null> {
    if (!this.pipelineInstance) return null;
    try {
      const output = await this.pipelineInstance(text, { pooling: 'mean', normalize: true });
      return Array.from(output.data);
    } catch (e) {
      console.error('Error generating embedding:', e);
      return null;
    }
  }

  // Pure TypeScript cosine similarity helper
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Fast TF-IDF / Jaccard token fallback matching
  private classifyFallback(text: string): { type: MemoryType; confidence: number } {
    const textTokens = this.tokenize(text);
    if (textTokens.length === 0) {
      return { type: 'ephemeral', confidence: 0.5 };
    }

    // Direct keyword overrides for high confidence Immutable rules
    const lowerText = text.toLowerCase();
    const immutableKeywords = ['never', 'do not', 'must not', 'compliance', 'guideline', 'security rule', 'prohibited', 'avoid', 'mandatory'];
    const sessionKeywords = ['build', 'create', 'implement', 'fix', 'refactor', 'setup', 'add a', 'render', 'write unit test'];
    
    // Check immutable keywords first
    for (const kw of immutableKeywords) {
      if (lowerText.includes(kw)) {
        // Boost likelihood of immutable if the tone is directive
        if (lowerText.includes('use') || lowerText.includes('allow') || lowerText.includes('do') || lowerText.includes('write')) {
          return { type: 'immutable', confidence: 0.85 };
        }
      }
    }

    let bestType: MemoryType = 'ephemeral';
    let highestSim = -1;

    for (const type of Object.keys(ANCHORS) as MemoryType[]) {
      for (const anchor of ANCHORS[type]) {
        const anchorTokens = this.tokenize(anchor);
        const sim = this.jaccardSimilarity(textTokens, anchorTokens);
        
        // Boost specific types based on keyword checks
        let boostedSim = sim;
        if (type === 'immutable') {
          for (const kw of immutableKeywords) {
            if (lowerText.includes(kw)) boostedSim += 0.15;
          }
        } else if (type === 'session') {
          for (const kw of sessionKeywords) {
            if (lowerText.includes(kw)) boostedSim += 0.15;
          }
        }

        if (boostedSim > highestSim) {
          highestSim = boostedSim;
          bestType = type;
        }
      }
    }

    // Normalize confidence bounds
    let confidence = Math.min(Math.max(highestSim * 2 + 0.3, 0.4), 0.95);
    return { type: bestType, confidence };
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
      .split(/\s+/)
      .filter(w => w.length > 2); // Filter out tiny words like "a", "to", "is"
  }

  private jaccardSimilarity(setA: string[], setB: string[]): number {
    const sA = new Set(setA);
    const sB = new Set(setB);
    const intersection = new Set([...sA].filter(x => sB.has(x)));
    const union = new Set([...sA, ...sB]);
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  // Core classification endpoint
  public async classify(text: string): Promise<{ type: MemoryType; confidence: number }> {
    // If embedding model is ready, run vector-based similarity
    if (this.isModelReady && this.pipelineInstance) {
      const inputEmbed = await this.getTransformersEmbedding(text);
      if (inputEmbed) {
        let bestType: MemoryType = 'ephemeral';
        let highestSimilarity = -1;

        for (const type of Object.keys(this.anchorEmbeddings) as MemoryType[]) {
          const embeds = this.anchorEmbeddings[type];
          for (const anchorEmbed of embeds) {
            const similarity = this.cosineSimilarity(inputEmbed, anchorEmbed);
            if (similarity > highestSimilarity) {
              highestSimilarity = similarity;
              bestType = type;
            }
          }
        }

        // Map similarity (ranges roughly 0.2 to 0.8+ for related things) to a reasonable confidence score
        const confidence = Math.min(Math.max((highestSimilarity - 0.2) / 0.6, 0.5), 0.99);
        return { type: bestType, confidence };
      }
    }

    // Fallback to TF-IDF / heuristic matcher
    return this.classifyFallback(text);
  }
}
