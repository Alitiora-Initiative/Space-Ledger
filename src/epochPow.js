'use strict';

const crypto = require('node:crypto');

const BLOCKS_PER_EPOCH = 210_000;
const POW_DIFFICULTY_BITS = 12;
const POW_DOMAIN = Buffer.from('SPACE_LEDGER_EPOCH_POW_V1');

function powHash(epoch, nonce, previousHash = Buffer.alloc(32)) {
  if (!Number.isSafeInteger(epoch) || epoch < 0) throw new RangeError('epoch must be a non-negative safe integer');
  if (!Number.isSafeInteger(nonce) || nonce < 0) throw new RangeError('nonce must be a non-negative safe integer');
  const payload = Buffer.concat([
    POW_DOMAIN,
    u64le(epoch),
    u64le(nonce),
    Buffer.from(previousHash),
  ]);
  const first = crypto.createHash('sha256').update(payload).digest();
  return crypto.createHash('sha256').update(first).digest();
}

function meetsTarget(digest) {
  const leading = Buffer.from(digest).readBigUInt64BE(0);
  return leading <= (2n ** 64n - 1n) >> BigInt(POW_DIFFICULTY_BITS);
}

function findNonce(epoch, previousHash = Buffer.alloc(32), startNonce = 0) {
  for (let nonce = startNonce; Number.isSafeInteger(nonce); nonce += 1) {
    const digest = powHash(epoch, nonce, previousHash);
    if (meetsTarget(digest)) return { nonce, digest };
  }
  throw new RangeError('nonce search exceeded the safe integer range');
}

function u64le(value) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(BigInt(value));
  return buffer;
}

module.exports = Object.freeze({
  BLOCKS_PER_EPOCH,
  POW_DIFFICULTY_BITS,
  meetsTarget,
  findNonce,
  powHash,
});
