import { ContextAllocator } from './allocator.js';
import { ARCA } from './index.js';

async function runTests() {
  console.log('--- Starting ARCA Context Allocator Verification Tests ---\n');

  // Scenario 1: Short prompt ("Build a login page."), Max Context: 8000.
  // Default tiered response reservation should be 1000. Safety buffer should default to 500.
  console.log('--- Scenario 1: Short prompt, default settings ---');
  const prompt1 = 'Build a login page.';
  const maxContext1 = 8000;
  const alloc1 = ContextAllocator.allocate(prompt1, maxContext1);
  console.log('Prompt:', prompt1);
  console.log('Result:', alloc1);
  
  // Assertions
  if (alloc1.promptTokens > 0 && alloc1.promptTokens < 100) {
    console.log('✅ promptTokens is small and correct:', alloc1.promptTokens);
  } else {
    console.error('❌ promptTokens unexpected value:', alloc1.promptTokens);
  }
  if (alloc1.reservedResponseTokens === 1000) {
    console.log('✅ reservedResponseTokens derived correctly as 1000 (tier 1: small)');
  } else {
    console.error('❌ reservedResponseTokens expected 1000, got:', alloc1.reservedResponseTokens);
  }
  if (alloc1.safetyBuffer === 500) {
    console.log('✅ safetyBuffer defaults to 500');
  } else {
    console.error('❌ safetyBuffer expected 500, got:', alloc1.safetyBuffer);
  }
  if (alloc1.availableMemoryBudget >= 6400) {
    console.log('✅ availableMemoryBudget is around 6500+:', alloc1.availableMemoryBudget);
  } else {
    console.error('❌ availableMemoryBudget unexpected value:', alloc1.availableMemoryBudget);
  }
  if (alloc1.allocationState === 'Healthy') {
    console.log('✅ allocationState is Healthy');
  } else {
    console.error('❌ allocationState expected Healthy, got:', alloc1.allocationState);
  }
  console.log();

  // Scenario 2: Very large prompt. Verify that available memory budget decreases.
  console.log('--- Scenario 2: Very large prompt ---');
  // Generate a prompt of ~1200 words (~1600 tokens)
  const prompt2 = 'Repeat '.repeat(1200) + 'Build a complex login page.';
  const maxContext2 = 8000;
  const alloc2 = ContextAllocator.allocate(prompt2, maxContext2);
  console.log('Prompt size (words): ~1200');
  console.log('Result:', alloc2);
  
  if (alloc2.promptTokens > 1000) {
    console.log('✅ promptTokens is large:', alloc2.promptTokens);
  } else {
    console.error('❌ promptTokens expected to be large, got:', alloc2.promptTokens);
  }
  if (alloc2.reservedResponseTokens === 1500) {
    console.log('✅ reservedResponseTokens derived correctly as 1500 (tier 2: medium)');
  } else {
    console.error('❌ reservedResponseTokens expected 1500, got:', alloc2.reservedResponseTokens);
  }
  if (alloc2.availableMemoryBudget < alloc1.availableMemoryBudget) {
    console.log('✅ availableMemoryBudget decreased:', alloc2.availableMemoryBudget);
  } else {
    console.error('❌ availableMemoryBudget expected to decrease');
  }
  console.log();

  // Scenario 3: Prompt almost fills the context window. Verify clamp to 0 and Critical state.
  console.log('--- Scenario 3: Prompt almost fills context window ---');
  // Generate a prompt of ~6000 words (~8000 tokens)
  const prompt3 = 'Word '.repeat(6000);
  const maxContext3 = 8000;
  const alloc3 = ContextAllocator.allocate(prompt3, maxContext3);
  console.log('Prompt size (words): ~6000');
  console.log('Result:', alloc3);
  
  if (alloc3.availableMemoryBudget === 0) {
    console.log('✅ availableMemoryBudget clamped to 0');
  } else {
    console.error('❌ availableMemoryBudget expected 0, got:', alloc3.availableMemoryBudget);
  }
  if (alloc3.allocationState === 'Critical') {
    console.log('✅ allocationState is Critical');
  } else {
    console.error('❌ allocationState expected Critical, got:', alloc3.allocationState);
  }
  console.log();

  // Scenario 4: Custom overrides.
  console.log('--- Scenario 4: Custom overrides ---');
  const prompt4 = 'Build a login page.';
  const maxContext4 = 8000;
  const alloc4 = ContextAllocator.allocate(prompt4, maxContext4, {
    reservedResponseTokens: 2500,
    safetyBuffer: 800
  });
  console.log('Result:', alloc4);
  
  if (alloc4.reservedResponseTokens === 2500) {
    console.log('✅ reservedResponseTokens override works');
  } else {
    console.error('❌ reservedResponseTokens expected 2500, got:', alloc4.reservedResponseTokens);
  }
  if (alloc4.safetyBuffer === 800) {
    console.log('✅ safetyBuffer override works');
  } else {
    console.error('❌ safetyBuffer expected 800, got:', alloc4.safetyBuffer);
  }
  console.log();

  // Scenario 5: Optimize integration test
  console.log('--- Scenario 5: Integrate into ARCA.optimize ---');
  const arca = new ARCA();
  const optResult = await arca.optimize(prompt1, 'chatgpt');
  console.log('ARCA.optimize return has allocation:', optResult.allocation !== undefined);
  if (optResult.allocation) {
    console.log('✅ allocation returned:', optResult.allocation);
  } else {
    console.error('❌ allocation not returned in optimize result');
  }
  console.log('\n--- All Tests Completed ---');
}

runTests().catch(console.error);
