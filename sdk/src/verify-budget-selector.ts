import { BudgetSelector } from './budgetSelector';
import { Memory } from './types';
import { estimateTokens } from './utils';

function generateContentForTokens(targetTokens: number): string {
  let content = 'word';
  while (estimateTokens(content) < targetTokens) {
    content += ' word';
  }
  return content;
}

function createMockMemory(id: string, size: number, importanceScore: number, referenceCount: number, confidenceScore: number, timestamp: number): Memory {
  return {
    id,
    content: generateContentForTokens(size),
    type: 'ephemeral',
    timestamp,
    importanceScore,
    referenceCount,
    confidenceScore,
    pinned: false,
    relatedMemories: []
  };
}

function runTests() {
  console.log('--- Starting ARCA Budget-Aware Memory Selector Verification Tests ---\n');

  // We define five memories with exact token sizes:
  // Sorted priority: A, B, C, D, E
  const memories: Memory[] = [
    createMockMemory('A', 600, 90, 5, 95, 1000), // Size: 600
    createMockMemory('B', 500, 80, 4, 90, 1001), // Size: 500
    createMockMemory('C', 400, 70, 3, 85, 1002), // Size: 400
    createMockMemory('D', 100, 60, 2, 80, 1003), // Size: 100
    createMockMemory('E', 100, 50, 1, 75, 1004)  // Size: 100
  ];

  console.log('Estimated Memory Sizes:');
  memories.forEach(m => {
    console.log(`  Memory ${m.id} size: ${estimateTokens(m.content)} tokens`);
  });
  console.log();

  // Scenario 1: Budget of 1000 tokens.
  // - A (600) fits. Remaining = 400.
  // - B (500) does not fit. Skipped.
  // - C (400) fits. Remaining = 0.
  // - D (100) does not fit. Skipped.
  // - E (100) does not fit. Skipped.
  // Expected Selected: A, C. Skipped: B, D, E.
  console.log('--- Scenario 1: Budget of 1000 tokens ---');
  const result1 = BudgetSelector.select(memories, 1000);
  console.log('Selected Memories:', result1.selectedMemories.map(m => m.id));
  console.log('Skipped Memories:', result1.skippedMemories.map(m => m.id));
  console.log(`Used Budget: ${result1.usedBudget}, Remaining: ${result1.remainingBudget}`);

  if (
    result1.selectedMemories.length === 2 &&
    result1.selectedMemories.some(m => m.id === 'A') &&
    result1.selectedMemories.some(m => m.id === 'C')
  ) {
    console.log('✅ Scenario 1 passed: correctly selected highest priority fitting memories A & C.');
  } else {
    console.error('❌ Scenario 1 failed.');
  }
  console.log();

  // Scenario 2: Budget of 300 tokens.
  // - A (600) does not fit. Skipped.
  // - B (500) does not fit. Skipped.
  // - C (400) does not fit. Skipped.
  // - D (100) fits. Remaining = 200. Selected.
  // - E (100) fits. Remaining = 100. Selected.
  // Expected Selected: D, E. Skipped: A, B, C.
  console.log('--- Scenario 2: Budget of 300 tokens ---');
  const result2 = BudgetSelector.select(memories, 300);
  console.log('Selected Memories:', result2.selectedMemories.map(m => m.id));
  console.log('Skipped Memories:', result2.skippedMemories.map(m => m.id));
  console.log(`Used Budget: ${result2.usedBudget}, Remaining: ${result2.remainingBudget}`);

  if (
    result2.selectedMemories.length === 2 &&
    result2.selectedMemories.some(m => m.id === 'D') &&
    result2.selectedMemories.some(m => m.id === 'E')
  ) {
    console.log('✅ Scenario 2 passed: higher priority skipped, lower priority selected because they fit.');
  } else {
    console.error('❌ Scenario 2 failed.');
  }
  console.log();

  // Scenario 3: Budget of 0 tokens.
  // Expected Selected: None. Skipped: All.
  console.log('--- Scenario 3: Budget of 0 tokens ---');
  const result3 = BudgetSelector.select(memories, 0);
  console.log('Selected Memories:', result3.selectedMemories.map(m => m.id));
  console.log('Skipped Memories:', result3.skippedMemories.map(m => m.id));
  
  if (result3.selectedMemories.length === 0 && result3.skippedMemories.length === 5) {
    console.log('✅ Scenario 3 passed: budget is 0, no memories selected, all skipped.');
  } else {
    console.error('❌ Scenario 3 failed.');
  }
  console.log();

  // Scenario 4: Budget larger than total memory size (e.g. 2000 tokens).
  // Expected Selected: All. Skipped: None.
  console.log('--- Scenario 4: Budget larger than total memory size ---');
  const result4 = BudgetSelector.select(memories, 2000);
  console.log('Selected Memories:', result4.selectedMemories.map(m => m.id));
  console.log('Skipped Memories:', result4.skippedMemories.map(m => m.id));
  console.log(`Used Budget: ${result4.usedBudget}, Remaining: ${result4.remainingBudget}`);
  
  if (result4.selectedMemories.length === 5 && result4.skippedMemories.length === 0 && result4.remainingBudget > 0) {
    console.log('✅ Scenario 4 passed: budget is ample, all selected, remaining budget calculated correctly.');
  } else {
    console.error('❌ Scenario 4 failed.');
  }
  console.log();

  // Scenario 5: Identical importance tie-breaker verification.
  console.log('--- Scenario 5: Deterministic Tie-Breaker Ordering ---');
  const tieMemories: Memory[] = [
    createMockMemory('OlderTime', 10, 80, 5, 90, 1000),
    createMockMemory('NewerTime', 10, 80, 5, 90, 2000),
    createMockMemory('HigherConf', 10, 80, 5, 95, 1000),
    createMockMemory('HigherRef', 10, 80, 8, 90, 1000),
    createMockMemory('LowerImp', 10, 70, 10, 99, 5000)
  ];

  const result5 = BudgetSelector.select(tieMemories, 1000);
  const sortedIds = result5.selectedMemories.map(m => m.id);
  console.log('Sorted Order:', sortedIds);

  const expectedOrder = ['HigherRef', 'HigherConf', 'NewerTime', 'OlderTime', 'LowerImp'];
  const matchesExpected = sortedIds.every((id, idx) => id === expectedOrder[idx]);

  if (matchesExpected) {
    console.log('✅ Scenario 5 passed: tie-break hierarchy resolved deterministically.');
  } else {
    console.error('❌ Scenario 5 failed. Expected:', expectedOrder, 'Got:', sortedIds);
  }

  console.log('\n--- All Tests Completed ---');
}

runTests();
