'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const service = require('../src/solanaService');

test('on-chain curve quote matches the one-microUSD fixed-point rule', () => {
  assert.equal(service.totalPriceMicroUsd(0n, 1), 1_000n);
  assert.equal(service.totalPriceMicroUsd(0n, 100), 100_494n);
  assert.ok(service.totalPriceMicroUsd(9_999_999_999n, 1) <= 1_000_000_000n);
  assert.throws(() => service.totalPriceMicroUsd(10_000_000_000n, 1), /unsold blocks/);
  assert.throws(() => service.totalPriceMicroUsd(0n, 0), /unsold blocks/);
});

test('SOL payment conversion rounds up to lamports', () => {
  assert.equal(service.usdMicroToLamports(1_000_000n, 10_000_000_000n, -8), 10_000_000n);
  assert.equal(service.usdMicroToLamports(1n, 10_000_000_000n, -8), 10n);
  assert.throws(() => service.usdMicroToLamports(1n, 0n, -8), /price is invalid/);
});

test('Pyth SOL/USD decoder checks feed identity, confidence, and freshness', () => {
  const account = Buffer.from('IvEjY51+9M1gMUcENA3t3zcf1CRyFI8kjp0abRpesqw6zYt/1dayQwHvDYtv2izrpB2hXUCV0do5Kg0vjtDGx7wPTPrIwoC1betYiZACAAAAEdwvAAAAAAD4////xK3LagAAAADDrctqAAAAAHTuYo0CAAAAzU8vAAAAAABOOWUeAAAAAAA=', 'base64');
  const publishTime = account.readBigInt64LE(93);
  const decoded = service.parsePythSolUsd(account, publishTime);
  assert.equal(decoded.price, 11_014_854_891n);
  assert.equal(decoded.exponent, -8);
  assert.throws(() => service.parsePythSolUsd(account, publishTime + 91n), /stale/);
  const wrongFeed = Buffer.from(account);
  wrongFeed[41] ^= 0xff;
  assert.throws(() => service.parsePythSolUsd(wrongFeed, publishTime), /not a fully verified/);
});
