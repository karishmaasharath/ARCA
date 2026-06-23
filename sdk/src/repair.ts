import { ValidationEngine } from './validator';

export class RepairEngine {
  /**
   * Automatically repairs a compressed text by injecting missing constraints
   * or technical variables. Run validation again after repair.
   */
  public static repair(
    original: string,
    compressed: string
  ): { repairedText: string; repaired: boolean } {
    const validation = ValidationEngine.validate(original, compressed);

    if (validation.isValid) {
      return { repairedText: compressed, repaired: false };
    }

    let repairHeader = '';
    const repairLines: string[] = [];

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
  public static runPipeline(
    original: string,
    compressFn: (text: string) => string
  ): { finalOutput: string; original: string; wasRepaired: boolean; isValidAfterRepair: boolean } {
    const compressed = compressFn(original);
    
    // Validate first pass
    const firstValidation = ValidationEngine.validate(original, compressed);
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
    const secondValidation = ValidationEngine.validate(original, repairedText);

    return {
      finalOutput: repairedText,
      original,
      wasRepaired: repaired,
      isValidAfterRepair: secondValidation.isValid
    };
  }
}
