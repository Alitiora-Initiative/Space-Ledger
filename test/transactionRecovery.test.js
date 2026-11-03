'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const recovery = require('../public/js/transactionRecovery');

function validRecord(overrides = {}) {
  return {
    version: 1,
    network: 'devnet',
    signature: '1'.repeat(64),
    blockhash: '2'.repeat(40),
    lastValidBlockHeight: 1234,
    buyer: '3'.repeat(40),
    startBlock: '100',
    blockCount: 2,
    asset: 'SOL',
    submittedAt: 1_800_000_000_000,
    ...overrides
  };
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key)
  };
}

test('pending purchase store persists only validated Devnet recovery metadata', () => {
  const storage = memoryStorage();
  const store = recovery.createPendingTransactionStore(storage, 'pending');
  const record = validRecord({ unexpectedSecret: 'must-not-be-stored' });

  assert.equal(store.save(record), true);
  const restored = store.load();
  assert.deepEqual(restored, validRecord());
  assert.equal(JSON.stringify(restored).includes('unexpectedSecret'), false);
  assert.equal(recovery.isValidRecord(restored), true);
});

test('pending purchase store refuses malformed records and mismatched clears', () => {
  const storage = memoryStorage();
  const store = recovery.createPendingTransactionStore(storage, 'pending');

  assert.equal(store.save(validRecord({ network: 'mainnet' })), false);
  assert.equal(store.save(validRecord({ blockCount: 0 })), false);
  assert.equal(store.save(validRecord({ signature: 'not a base58 signature!' })), false);
  assert.equal(store.save(validRecord()), true);
  assert.equal(store.clear('different-signature'), false);
  assert.ok(store.load());
  assert.equal(store.clear('1'.repeat(64)), true);
  assert.equal(store.load(), null);
});

test('pending purchase store handles unavailable browser storage without throwing', () => {
  const store = recovery.createPendingTransactionStore(null);
  assert.equal(store.save(validRecord()), false);
  assert.equal(store.load(), null);
  assert.equal(store.clear(), false);
});

test('signature status distinguishes failed, confirmed, pending and expired outcomes', () => {
  assert.equal(recovery.classifySignatureStatus({ err: { InstructionError: [0, 'Custom'] } }, 10, 20), 'failed');
  assert.equal(recovery.classifySignatureStatus({ confirmationStatus: 'confirmed', err: null }, 10, 20), 'confirmed');
  assert.equal(recovery.classifySignatureStatus({ confirmationStatus: 'finalized', err: null }, 10, 20), 'confirmed');
  assert.equal(recovery.classifySignatureStatus({ confirmations: null, err: null }, 10, 20), 'confirmed');
  assert.equal(recovery.classifySignatureStatus({ confirmationStatus: 'processed', err: null }, 10, 20), 'pending');
  assert.equal(recovery.classifySignatureStatus(null, 21, 20), 'expired');
  assert.equal(recovery.classifySignatureStatus(null, 20, 20), 'unknown');
});

test('simulation errors preserve the RPC failure and useful program logs', () => {
  assert.equal(recovery.formatSimulationFailure({ value: { err: null, logs: [] } }), null);
  assert.match(recovery.formatSimulationFailure(null), /invalid simulation response/);
  assert.match(recovery.formatSimulationFailure({ value: {} }), /invalid simulation response/);
  const message = recovery.formatSimulationFailure({
    value: {
      err: { InstructionError: [1, 'Custom'] },
      logs: ['Program log: start', 'Program failed: custom error']
    }
  });
  assert.match(message, /InstructionError/);
  assert.match(message, /Program failed: custom error/);
});
