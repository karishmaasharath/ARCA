"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryRetriever = void 0;
class MemoryRetriever {
    static retrieve(query, memories, limit = 20) {
        const queryWords = query
            .toLowerCase()
            .split(/\s+/)
            .filter(word => word.length > 3);
        const results = memories
            .map(memory => {
            const memoryWords = memory.content
                .toLowerCase()
                .split(/\s+/);
            let overlap = queryWords.filter(word => memoryWords.includes(word)).length;
            // Boost important memory types
            if (memory.type === 'immutable') {
                overlap += 5;
            }
            if (memory.type === 'persistent') {
                overlap += 2;
            }
            return {
                memory,
                overlap
            };
        })
            .filter(item => item.overlap > 0)
            .sort((a, b) => b.overlap - a.overlap)
            .slice(0, limit)
            .map(item => item.memory);
        return results;
    }
}
exports.MemoryRetriever = MemoryRetriever;
