"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticFadingEngine = void 0;
const utils_1 = require("./utils");
class SemanticFadingEngine {
    /**
     * Evaluates memories against a memory count budget (maxMemories) or a token budget,
     * splitting them into kept (active) and removed (faded) memories.
     *
     * Pinned memories are always preserved and bypass the fading logic.
     * Immutable memories are preserved unless absolutely necessary.
     */
    static fade(memories, budget) {
        const currentTime = Date.now();
        // 1. Calculate fading scores and explanations for all memories
        const scoredMemories = memories.map(mem => {
            const dependencyCount = mem.relatedMemories?.length || 0;
            // Importance Weight
            let importanceWeight = 10;
            switch (mem.type) {
                case 'immutable':
                    importanceWeight = 100;
                    break;
                case 'persistent':
                    importanceWeight = 40;
                    break;
                case 'session':
                    importanceWeight = 20;
                    break;
                case 'ephemeral':
                    importanceWeight = 10;
                    break;
            }
            // Reference Weight
            const referenceWeight = Math.min(mem.referenceCount * 2, 20);
            // Recency Weight (exponential decay with 15-day half-life/decay constant)
            const elapsedMs = Math.max(0, currentTime - mem.timestamp);
            const elapsedDays = elapsedMs / (24 * 60 * 60 * 1000);
            const recencyWeight = Math.round(20 * Math.exp(-elapsedDays / 15));
            // Dependency Weight
            const dependencyWeight = Math.min(dependencyCount * 4, 20);
            const fadingScore = importanceWeight + referenceWeight + recencyWeight + dependencyWeight;
            // Generate explainability reason
            const explanation = SemanticFadingEngine.generateExplanation(mem, elapsedDays);
            // Create updated memory object
            const updatedMem = {
                ...mem,
                dependencyCount,
                fadingScore,
                explanation
            };
            return updatedMem;
        });
        // 2. Separate Pinned and Unpinned memories
        const pinned = scoredMemories.filter(m => m.pinned);
        const unpinned = scoredMemories.filter(m => !m.pinned);
        // Sort unpinned memories by fadingScore descending, then by timestamp descending
        unpinned.sort((a, b) => {
            const scoreDiff = (b.fadingScore || 0) - (a.fadingScore || 0);
            if (scoreDiff !== 0)
                return scoreDiff;
            return b.timestamp - a.timestamp;
        });
        const keptMemories = [];
        const removedMemories = [];
        // Detect if the budget represents token budget or memory count limit
        // Custom threshold: if budget is >= 50, it is treated as a token budget.
        // Otherwise, it is treated as a maximum memory count limit.
        const isTokenBudget = budget >= 50;
        if (isTokenBudget) {
            let currentTokens = 0;
            // Pinned memories must be kept
            for (const mem of pinned) {
                keptMemories.push(mem);
                currentTokens += (0, utils_1.estimateTokens)(mem.content);
            }
            // Fit unpinned memories
            for (const mem of unpinned) {
                const tokens = (0, utils_1.estimateTokens)(mem.content);
                // Immutable memories must be kept unless it is absolutely necessary
                // For token budgets, we force-keep unpinned immutable memories to avoid breaking critical rules
                if (mem.type === 'immutable') {
                    keptMemories.push(mem);
                    currentTokens += tokens;
                }
                else {
                    if (currentTokens + tokens <= budget) {
                        keptMemories.push(mem);
                        currentTokens += tokens;
                    }
                    else {
                        removedMemories.push(mem);
                    }
                }
            }
        }
        else {
            // Count budget (maxMemories)
            // Keep all pinned memories (they bypass fading logic and count limits)
            for (const mem of pinned) {
                keptMemories.push(mem);
            }
            // Fill remaining budget slots with highest-scoring unpinned memories
            for (const mem of unpinned) {
                if (keptMemories.length < budget) {
                    keptMemories.push(mem);
                }
                else {
                    removedMemories.push(mem);
                }
            }
        }
        // Sort active/kept memories chronologically to maintain prompt coherence
        keptMemories.sort((a, b) => a.timestamp - b.timestamp);
        const totalBefore = memories.length;
        const totalAfter = keptMemories.length;
        const reductionPercentage = totalBefore > 0
            ? Math.round(((totalBefore - totalAfter) / totalBefore) * 100)
            : 0;
        const totalActiveTokens = keptMemories.reduce((sum, mem) => sum + (0, utils_1.estimateTokens)(mem.content), 0);
        return {
            keptMemories,
            removedMemories,
            totalBefore,
            totalAfter,
            reductionPercentage,
            // Backwards compatibility
            active: keptMemories,
            faded: removedMemories,
            totalActiveTokens
        };
    }
    /**
     * Generates a human-readable explanation of why a memory was kept or removed.
     */
    static generateExplanation(memory, elapsedDays) {
        if (memory.pinned) {
            return "Pinned memory. Bypasses fading logic.";
        }
        const parts = [];
        // 1. Importance description
        if (memory.type === 'immutable') {
            parts.push("Immutable memory.");
        }
        else if (memory.type === 'persistent') {
            parts.push("Persistent memory.");
        }
        else if (memory.type === 'session') {
            parts.push("Session memory.");
        }
        else {
            parts.push("Low importance.");
        }
        // 2. Reference count
        if (memory.referenceCount > 0) {
            parts.push(`Referenced ${memory.referenceCount} times.`);
        }
        else {
            parts.push("Reference count = 0.");
        }
        // 3. Dependencies
        const depCount = memory.relatedMemories?.length || 0;
        if (depCount > 0) {
            parts.push(`Connected to ${depCount} other ${depCount === 1 ? 'memory' : 'memories'}.`);
        }
        else {
            parts.push("No dependencies.");
        }
        // 4. Recency
        if (elapsedDays < 1) {
            if (memory.type === 'ephemeral' || memory.referenceCount === 0) {
                parts.push("Recently used.");
            }
        }
        else {
            if (memory.type === 'ephemeral' || memory.referenceCount === 0) {
                parts.push("Not recently used.");
            }
        }
        return parts.join(' ');
    }
}
exports.SemanticFadingEngine = SemanticFadingEngine;
