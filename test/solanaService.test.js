'use strict';

const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const test = require('node:test');
const service = require('../src/solanaService');
const { Keypair, PublicKey } = require('@solana/web3.js');

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

test('purchase receipt decoder validates owner, discriminator, bounds, asset, and PDA', () => {
  const programId = Keypair.generate().publicKey;
  const buyer = Keypair.generate().publicKey;
  const data = Buffer.alloc(85);
  data.set(createHash('sha256').update('account:PurchaseReceipt').digest().subarray(0, 8), 0);
  data.writeBigUInt64LE(12n, 8);
  data.writeUInt32LE(3, 16);
  buyer.toBuffer().copy(data, 20);
  data[52] = 0;
  data.writeBigUInt64LE(3000n, 53);
  data.writeBigUInt64LE(2900n, 61);
  data.writeBigUInt64LE(100n, 69);
  data.writeBigInt64LE(1_800_000_000n, 77);
  const [receipt] = PublicKey.findProgramAddressSync([Buffer.from('receipt'), Buffer.from([12, 0, 0, 0, 0, 0, 0, 0])], programId);
  const account = { owner: programId, data };

  const decoded = service.decodePurchaseReceipt(receipt, account, programId);
  assert.equal(decoded.buyer, buyer.toBase58());
  assert.equal(decoded.startBlock, '12');
  assert.equal(decoded.blockCount, 3);
  assert.equal(decoded.endBlock, '14');
  assert.equal(decoded.asset, 'SOL');
  assert.equal(decoded.paidUnits, '3000');

  const wrongDiscriminator = Buffer.from(data);
  wrongDiscriminator[0] ^= 0xff;
  assert.throws(() => service.decodePurchaseReceipt(receipt, { owner: programId, data: wrongDiscriminator }, programId), /failed validation/);
  assert.throws(() => service.decodePurchaseReceipt(receipt, { owner: Keypair.generate().publicKey, data }, programId), /failed validation/);
  const invalidRange = Buffer.from(data);
  invalidRange.writeBigUInt64LE(10_000_000_000n, 8);
  assert.throws(() => service.decodePurchaseReceipt(receipt, { owner: programId, data: invalidRange }, programId), /failed validation/);
});

test('detectRpcProvider categorizes host class without exposing credentials', () => {
  assert.equal(service.detectRpcProvider('https://api.devnet.solana.com'), 'public-devnet');
  assert.equal(service.detectRpcProvider('https://devnet.helius-rpc.com/?api-key=secret-key-12345'), 'helius-devnet');
  assert.equal(service.detectRpcProvider('https://mainnet.helius-rpc.com/?api-key=xyz'), 'helius-devnet');
  assert.equal(service.detectRpcProvider('https://other-rpc.example.com'), 'public-devnet');
  assert.equal(service.detectRpcProvider('invalid-url'), 'public-devnet');
  assert.equal(service.detectRpcProvider(undefined), 'public-devnet');
});

