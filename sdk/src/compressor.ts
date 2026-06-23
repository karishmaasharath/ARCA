import { Memory } from './types';
import { estimateTokens } from './utils';

export class TokenCompressor {
  // Common technical contractions
  private static ABBREVIATIONS: Record<string, string> = {
    "database": "DB",
    "databases": "DBs",
    "configuration": "config",
    "configurations": "configs",
    "function": "fn",
    "functions": "fns",
    "parameter": "param",
    "parameters": "params",
    "argument": "arg",
    "arguments": "args",
    "information": "info",
    "request": "req",
    "requests": "reqs",
    "response": "res",
    "responses": "res",
    "application": "app",
    "applications": "apps",
    "authentication": "auth",
    "authorization": "auth",
    "development": "dev",
    "production": "prod",
    "environment": "env",
    "environments": "envs",
    "repository": "repo",
    "repositories": "repos",
    "temporary": "temp",
    "management": "mgt",
    "initialize": "init",
    "identifier": "id",
    "identifiers": "ids",
    "different": "diff",
    "frequency": "freq",
    "statistics": "stats"
  };

  private static FILLERS = new Set([
    "basically", "actually", "really", "literally", "simply", "just", "very", "extremely",
    "please", "kindly", "here is", "there is", "there are", "i want to", "i would like to",
    "let us", "let's", "in order to", "as a matter of fact", "so to speak"
  ]);

  /**
   * Compresses a single string based on a selected strategy.
   * Strategically preserves variable names, code blocks, function calls, and negatives.
   */
  public static compressText(text: string, strategy: 'minimal' | 'moderate' | 'aggressive'): string {
    if (!text || text.trim() === "") return "";

    // 1. Separate code blocks from text blocks so we never touch code contents
    const parts = text.split(/(```[\s\S]*?```)/g);
    const compressedParts = parts.map(part => {
      // If it's a code block, leave it completely untouched
      if (part.startsWith('```') && part.endsWith('```')) {
        return part;
      }
      return this.compressTextBlock(part, strategy);
    });

    return compressedParts.join('').replace(/\n{3,}/g, '\n\n').trim();
  }

  private static compressTextBlock(text: string, strategy: 'minimal' | 'moderate' | 'aggressive'): string {
    if (strategy === 'minimal') {
      // Just strip leading/trailing spaces and collapse multiple spaces
      return text.replace(/[ \t]+/g, ' ');
    }

    let sentences = text.split(/([.!?]\s+)/);
    let results: string[] = [];

    for (let i = 0; i < sentences.length; i++) {
      const segment = sentences[i];
      if (i % 2 === 1) {
        // This is a sentence separator (.!? and spaces), keep it
        results.push(segment);
        continue;
      }

      if (segment.trim() === '') {
        results.push(segment);
        continue;
      }

      // Tokenize sentence into words
      const words = segment.split(/(\s+)/);
      const processedWords = words.map(word => {
        const trimmed = word.trim();
        if (trimmed === '') return word;

        // Strip punctuation for matching, but keep it for reconstruction
        const match = trimmed.match(/^([^\w]*)(.*?)([^\w]*)$/);
        if (!match) return word;

        const prefix = match[1];
        const cleanWord = match[2];
        const suffix = match[3];

        // 1. Never contract potential variable names, camelCase, snake_case, or function calls
        if (
          cleanWord.includes('_') || 
          /[a-z][A-Z]/.test(cleanWord) || 
          cleanWord.endsWith('()') ||
          /^[A-Z_]+$/.test(cleanWord) // UPPER_SNAKE_CASE constant
        ) {
          return word; // Keep original structure
        }

        const lowerWord = cleanWord.toLowerCase();

        // 2. Avoid dropping negative constraints
        const negativeKeywords = ['not', 'never', 'avoid', 'no', 'without', 'except', 'prevent', 'prohibit'];
        if (negativeKeywords.includes(lowerWord)) {
          return word;
        }

        // 3. Remove filler words in moderate/aggressive
        if (this.FILLERS.has(lowerWord)) {
          return '';
        }

        // 4. In aggressive mode, we also remove standard grammatical articles
        if (strategy === 'aggressive') {
          const articles = ['the', 'a', 'an'];
          if (articles.includes(lowerWord)) {
            return '';
          }
        }

        // 5. Replace with abbreviation if exists
        if (this.ABBREVIATIONS[lowerWord]) {
          const isTitleCase = cleanWord[0] === cleanWord[0].toUpperCase() && cleanWord.length > 1;
          const abbrev = this.ABBREVIATIONS[lowerWord];
          const finalAbbrev = isTitleCase ? abbrev[0].toUpperCase() + abbrev.slice(1) : abbrev;
          return prefix + finalAbbrev + suffix;
        }

        return word;
      });

      // Clean up multiple spaces resulting from removed words
      const reconstructed = processedWords.join('').replace(/[ \t]+/g, ' ');
      results.push(reconstructed);
    }

    return results.join('').replace(/[ \t]+/g, ' ').trim();
  }

  /**
   * Compresses a batch of active memories, calculating token counts.
   * Immutable memories are NEVER compressed.
   */
  public static compressMemories(
    memories: Memory[],
    strategy: 'minimal' | 'moderate' | 'aggressive'
  ): { compressedMemories: Memory[]; originalTokens: number; compressedTokens: number; savingsRate: number } {
    let originalTokens = 0;
    let compressedTokens = 0;

    const compressedMemories = memories.map(mem => {
      const origTok = estimateTokens(mem.content);
      originalTokens += origTok;

      // Immutable memories never get compressed
      if (mem.type === 'immutable') {
        compressedTokens += origTok;
        return mem;
      }

      const compressedContent = this.compressText(mem.content, strategy);
      const compTok = estimateTokens(compressedContent);
      compressedTokens += compTok;

      return {
        ...mem,
        content: compressedContent
      };
    });

    const savings = originalTokens - compressedTokens;
    const savingsRate = originalTokens > 0 ? (savings / originalTokens) * 100 : 0;

    return {
      compressedMemories,
      originalTokens,
      compressedTokens,
      savingsRate: Math.max(0, Math.round(savingsRate))
    };
  }
}
