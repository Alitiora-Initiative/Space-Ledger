const test = require('node:test')
const assert = require('node:assert/strict')
const { bitcoinWorkHash, compactTargetToBigInt, doubleSha256, verifyBitcoinHeader } = require('../src/bitcoinCheckpoint.js')

test('double SHA-256 is deterministic', () => {
  assert.equal(doubleSha256(Buffer.from('abc')).toString('hex'), '4f8b42c22dd3729b519ba6f68d2da7cc5b2d606d05daed5ad5128cc03e6c6358')
})

test('compact Bitcoin target decoding preserves exponent', () => {
  assert.equal(compactTargetToBigInt(0x1d00ffff), 0x00000000ffffn << 208n)
})

test('malformed Bitcoin headers are rejected', () => {
  assert.throws(() => bitcoinWorkHash('00'), /exactly 80 bytes/)
})
