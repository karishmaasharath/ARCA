import { ARCA } from './index.js';
import { SDK_VERSION } from './utils.js';

async function runVerification() {
  console.log('--- Starting ARCA Memory Import/Export Verification ---\n');

  const arca = new ARCA();
  const store = arca.getStore();

  // Clear store to ensure clean starting state
  await store.clear();

  // ----------------------------------------------------
  // Scenario 1: Export memories
  // ----------------------------------------------------
  console.log('--- Scenario 1: Exporting 5 memories ---');
  await arca.ingest("Never use Firebase; stick strictly to SQL databases.", { type: "immutable" });
  await arca.ingest("Always enforce GDPR and HIPAA compliance for user data.", { type: "immutable" });
  await arca.ingest("Our backend stack is built using Python, FastAPI, and SQLAlchemy.", { type: "persistent" });
  await arca.ingest("Add a database schema script for user profile metadata.", { type: "session" });
  await arca.ingest("The office coffee machine is broken.", { type: "ephemeral" });

  const initialMemories = await store.getAll();
  console.log(`Ingested ${initialMemories.length} memories into clean store.`);
  if (initialMemories.length !== 5) {
    throw new Error(`Expected 5 memories, found ${initialMemories.length}`);
  }

  const exportJson = await arca.exportMemories();
  const parsedExport = JSON.parse(exportJson);

  console.log('Export Schema Version:', parsedExport.version);
  console.log('ARCA SDK Version:', parsedExport.arcaVersion);
  console.log('Exported Memories Count:', parsedExport.memories.length);

  // Assertions
  if (parsedExport.version !== '1.0.0') {
    throw new Error(`Expected schema version "1.0.0", got "${parsedExport.version}"`);
  }
  if (parsedExport.arcaVersion !== SDK_VERSION) {
    throw new Error(`Expected arcaVersion "${SDK_VERSION}", got "${parsedExport.arcaVersion}"`);
  }
  if (parsedExport.memories.length !== 5) {
    throw new Error(`Expected 5 memories in export array, got ${parsedExport.memories.length}`);
  }
  console.log('✅ Scenario 1 Passed: JSON structure valid, schema/SDK versions correct, metadata preserved.\n');

  // ----------------------------------------------------
  // Scenario 2: Import exported JSON
  // ----------------------------------------------------
  console.log('--- Scenario 2: Importing exported JSON into clean store ---');
  await store.clear();
  const emptyMemories = await store.getAll();
  console.log(`Database cleared. Current memory count: ${emptyMemories.length}`);

  const importResult = await arca.importMemories(exportJson);
  console.log('Import Result:', importResult);

  if (!importResult.success) {
    throw new Error('Import failed.');
  }
  if (importResult.imported !== 5) {
    throw new Error(`Expected 5 imported memories, got ${importResult.imported}`);
  }

  const restoredMemories = await store.getAll();
  console.log(`Memories in database after import: ${restoredMemories.length}`);
  if (restoredMemories.length !== 5) {
    throw new Error(`Expected 5 memories, found ${restoredMemories.length}`);
  }

  // Check if content matches exactly
  for (const initial of initialMemories) {
    const matched = restoredMemories.find(r => r.id === initial.id);
    if (!matched) {
      throw new Error(`Could not find restored memory with ID ${initial.id}`);
    }
    if (matched.content !== initial.content || matched.type !== initial.type || matched.importanceScore !== initial.importanceScore) {
      throw new Error(`Metadata mismatch for memory ID ${initial.id}`);
    }
  }
  console.log('✅ Scenario 2 Passed: Memories successfully restored with no corruption.\n');

  // ----------------------------------------------------
  // Scenario 3: Import duplicate memories
  // ----------------------------------------------------
  console.log('--- Scenario 3: Importing duplicate memories ---');
  const duplicateResult = await arca.importMemories(exportJson);
  console.log('Duplicate Import Result:', duplicateResult);

  if (duplicateResult.imported !== 0) {
    throw new Error(`Expected 0 imported, got ${duplicateResult.imported}`);
  }
  if (duplicateResult.skippedDuplicates !== 5) {
    throw new Error(`Expected 5 skipped duplicates, got ${duplicateResult.skippedDuplicates}`);
  }
  
  const postDuplicateCount = await store.getAll();
  console.log(`Current memory count in database: ${postDuplicateCount.length}`);
  if (postDuplicateCount.length !== 5) {
    throw new Error(`Expected database count to remain 5, got ${postDuplicateCount.length}`);
  }
  console.log('✅ Scenario 3 Passed: Duplicate IDs ignored, existing database memories preserved.\n');

  // ----------------------------------------------------
  // Scenario 4: Import malformed JSON
  // ----------------------------------------------------
  console.log('--- Scenario 4: Importing malformed JSON ---');
  const malformedJson = '{"version": "1.0.0", "arcaVersion": "1.0.0", "memories": [ { "id": "123", "content": ';
  try {
    await arca.importMemories(malformedJson);
    throw new Error('Expected importMemories to throw for malformed JSON, but it succeeded.');
  } catch (err: any) {
    console.log('Caught expected validation error:', err.message);
    if (!err.message.includes('Invalid JSON')) {
      throw new Error(`Unexpected error message: ${err.message}`);
    }
  }
  console.log('✅ Scenario 4 Passed: Descriptive error thrown for malformed JSON.\n');

  // ----------------------------------------------------
  // Scenario 5: Import unsupported version
  // ----------------------------------------------------
  console.log('--- Scenario 5: Importing unsupported version ---');
  const unsupportedVersionJson = JSON.stringify({
    version: "2.0.0",
    arcaVersion: SDK_VERSION,
    exportedAt: new Date().toISOString(),
    memories: []
  });
  try {
    await arca.importMemories(unsupportedVersionJson);
    throw new Error('Expected importMemories to throw for unsupported version, but it succeeded.');
  } catch (err: any) {
    console.log('Caught expected version error:', err.message);
    if (!err.message.includes('Unsupported export version')) {
      throw new Error(`Unexpected error message: ${err.message}`);
    }
  }
  console.log('✅ Scenario 5 Passed: Clean rejection of unsupported export versions.\n');

  // ----------------------------------------------------
  // Scenario 6: Lossless Round-Trip Verification
  // ----------------------------------------------------
  console.log('--- Scenario 6: Lossless Round-Trip Verification ---');
  // First export
  const export1Json = await arca.exportMemories();
  const export1 = JSON.parse(export1Json);

  // Clear database
  await store.clear();

  // Import into clean database
  await arca.importMemories(export1Json);

  // Second export
  const export2Json = await arca.exportMemories();
  const export2 = JSON.parse(export2Json);

  // Compare Export 1 and Export 2
  if (export1.memories.length !== export2.memories.length) {
    throw new Error(`Export size mismatch: export1 length ${export1.memories.length}, export2 length ${export2.memories.length}`);
  }

  for (let i = 0; i < export1.memories.length; i++) {
    const m1 = export1.memories[i];
    const m2 = export2.memories.find((m: any) => m.id === m1.id);
    if (!m2) {
      throw new Error(`Memory ID ${m1.id} not found in second export`);
    }

    // Compare all properties except timestamp
    const keysToCompare = ['id', 'content', 'type', 'importanceScore', 'referenceCount', 'relatedMemories', 'expired', 'archived', 'pinned'];
    for (const key of keysToCompare) {
      const val1 = (m1 as any)[key];
      const val2 = (m2 as any)[key];

      if (Array.isArray(val1)) {
        if (!Array.isArray(val2) || val1.length !== val2.length || !val1.every((v, index) => v === val2[index])) {
          throw new Error(`Mismatch in array property '${key}' for ID ${m1.id}. Export 1: ${JSON.stringify(val1)}, Export 2: ${JSON.stringify(val2)}`);
        }
      } else if (val1 !== val2) {
        throw new Error(`Mismatch in property '${key}' for ID ${m1.id}. Export 1: ${val1}, Export 2: ${val2}`);
      }
    }
  }
  console.log('✅ Scenario 6 Passed: Lossless round-trip verification successful.\n');

  console.log('🎉 --- All Verification Scenarios Completed Successfully! ---');
}

runVerification().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
