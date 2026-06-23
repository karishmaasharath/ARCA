import { ValidationResult } from './types';

export class ValidationEngine {
  /**
   * Checks if the compressed text preserves all rules, negative constraints,
   * variable names, and function structures from the original text.
   */
  public static validate(original: string, compressed: string): ValidationResult {
    const missingRules: string[] = [];
    const missingEntities: string[] = [];

    // 1. Extract Negative Rules/Constraints (sentences containing never, avoid, do not, must)
    const originalSentences = original.split(/[.!?\n]+/).map(s => s.trim()).filter(s => s.length > 0);
    const ruleKeywords = ['never', 'do not', 'must', 'avoid', 'rule', 'prohibit', 'restrict', 'prevent'];
    
    const originalRules = originalSentences.filter(sentence => {
      const lower = sentence.toLowerCase();
      return ruleKeywords.some(kw => lower.includes(kw));
    });

    for (const rule of originalRules) {
      // Clean rule text for loose comparison (ignoring punctuation/spaces)
      const cleanRule = rule.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").toLowerCase();
      // Split into keywords to see if the semantic core exists in the compressed text
      const ruleKeywords = cleanRule.split(/\s+/).filter(w => w.length > 3); // Words longer than 3 chars
      
      const compLower = compressed.toLowerCase();
      // A simple heuristic: if a rule is completely missing or less than 50% of its key terms are in the compressed text,
      // we consider it broken.
      if (ruleKeywords.length > 0) {
        const matches = ruleKeywords.filter(kw => compLower.includes(kw));
        const matchRatio = matches.length / ruleKeywords.length;
        if (matchRatio < 0.5) {
          missingRules.push(rule);
        }
      }
    }

    // 2. Extract technical entities (variables, functions, custom terms)
    // - Matches camelCase: [a-z]+[A-Z][a-zA-Z0-9]*
    // - Matches snake_case / constant: [a-zA-Z]+_[a-zA-Z0-9_]*
    // - Matches function call: [a-zA-Z0-9_]+\(\)
    const entityRegex = /\b([a-z]+[A-Z][a-zA-Z0-9]*|[a-zA-Z]+_[a-zA-Z0-9_]*|[a-zA-Z0-9_]+\(\))\b/g;
    
    const originalEntities = new Set<string>();
    let match;
    while ((match = entityRegex.exec(original)) !== null) {
      originalEntities.add(match[1]);
    }

    // Check if these entities exist in the compressed text
    for (const entity of originalEntities) {
      if (!compressed.includes(entity)) {
        missingEntities.push(entity);
      }
    }

    const isValid = missingRules.length === 0 && missingEntities.length === 0;

    return {
      isValid,
      missingRules,
      missingEntities
    };
  }
}
