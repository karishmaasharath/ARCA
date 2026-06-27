"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepairEngine = void 0;
const validator_1 = require("./validator");
class RepairEngine {
    /**
     * Automatically repairs a compressed text by injecting missing constraints
     * or technical variables. Run validation again after repair.
     */
    static repair(original, compressed) {
        const validation = validator_1.ValidationEngine.validate(original, compressed);
        if (validation.isValid) {
            return { repairedText: compressed, repaired: false };
        }
        let repairHeader = '';
        const repairLines = [];
        // Restore missing rules
        if (validation.missingRules.length > 0) {
            repairLines.push(...validation.missingRules);
        }
        // Restore missing variable / function entities
        if (validation.missingEntities.length > 0) {
            repairLines.push(`Critical references preserved: ${validation.missingEntities.join(', ')}`);
        }
        if (repairLines.length > 0) {
            // Build a neat system rule injection block
            repairHeader = `[ARCA Rule Preservation Overlay: Keep in mind the following constraints during your response:\n- ${repairLines.join('\n- ')}]\n\n`;
        }
        return {
            repairedText: repairHeader + compressed,
            repaired: true
        };
    }
    /**
     * Executes the full pipeline: Compress -> Validate -> Repair -> Validate Again.
     */
    static runPipeline(original, compressFn) {
        const compressed = compressFn(original);
        // Validate first pass
        const firstValidation = validator_1.ValidationEngine.validate(original, compressed);
        if (firstValidation.isValid) {
            return {
                finalOutput: compressed,
                original,
                wasRepaired: false,
                isValidAfterRepair: true
            };
        }
        // Repair pass
        const { repairedText, repaired } = this.repair(original, compressed);
        // Validate second pass (should always be valid, but we log the status)
        const secondValidation = validator_1.ValidationEngine.validate(original, repairedText);
        return {
            finalOutput: repairedText,
            original,
            wasRepaired: repaired,
            isValidAfterRepair: secondValidation.isValid
        };
    }
}
exports.RepairEngine = RepairEngine;
