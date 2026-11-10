'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { BLOCKS_PER_EPOCH, findNonce, meetsTarget, powHash } = require('../src/epochPow');

test('epoch PoW uses Bitcoin-style double SHA-256 and finds a valid nonce', () => {
  const previousHash = Buffer.alloc(32);
  const result = findNonce(0, previousHash);
  assert.equal(BLOCKS_PER_EPOCH, 210_000);
  assert.equal(result.digest.equals(powHash(0, result.nonce, previousHash)), true);
  assert.equal(meetsTarget(result.digest), true);
});

test('epoch PoW changes when the epoch or nonce changes', () => {
  assert.equal(powHash(0, 0).equals(powHash(1, 0)), false);
  assert.equal(powHash(0, 0).equals(powHash(0, 1)), false);
});
