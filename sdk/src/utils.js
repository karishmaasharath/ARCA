"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateTokens = estimateTokens;
exports.generateId = generateId;
/**
   * Estimates token count for a given text string.
   * On average, 1 token is about 4 characters or 0.75 words of English text.
   */
function estimateTokens(text) {
    if (!text)
        return 0;
    // Clean whitespace and count
    const charCount = text.length;
    const wordCount = text.trim().split(/\s+/).length;
    // Combine character-based and word-based estimations for better reliability
    const tokenEstChar = charCount / 4.0;
    const tokenEstWord = wordCount * 1.33;
    // Average the two and round up
    const est = Math.ceil((tokenEstChar + tokenEstWord) / 2);
    // Account for extra syntax like code blocks, which contain dense symbols
    const codeBlockCount = (text.match(/```/g) || []).length / 2;
    const syntaxWeight = (text.match(/[{}[\]()=;<>+\-*\/&|!^%~]/g) || []).length * 0.25;
    return est + Math.ceil(codeBlockCount * 4) + Math.ceil(syntaxWeight);
}
function generateId() {
    return Math.random().toString(36).substring(2, 11);
}
