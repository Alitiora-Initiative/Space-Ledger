const { createHash } = require('node:crypto')

const MAX_U32 = 0xffffffffn

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest()
}

function doubleSha256(bytes) {
  return sha256(sha256(bytes))
}

function compactTargetToBigInt(bits) {
  const exponent = bits >>> 24
  const mantissa = BigInt(bits & 0x007fffff)
  if (exponent <= 3) return mantissa >> BigInt(8 * (3 - exponent))
  return mantissa << BigInt(8 * (exponent - 3))
}

function bitcoinWorkHash(headerHex) {
  if (!/^[0-9a-fA-F]{160}$/.test(headerHex)) throw new Error('Bitcoin headers must be exactly 80 bytes')
  return doubleSha256(Buffer.from(headerHex, 'hex'))
}

function verifyBitcoinHeader({ headerHex, expectedPrevHashHex, expectedHeight, bits }) {
  const header = Buffer.from(headerHex, 'hex')
  const previousHash = Buffer.from(header.subarray(4, 36)).reverse().toString('hex')
  const timestamp = header.readUInt32LE(68)
  const headerBits = header.readUInt32LE(72)
  const nonce = header.readUInt32LE(76)
  const hash = bitcoinWorkHash(headerHex)
  const workValue = BigInt(`0x${Buffer.from(hash).reverse().toString('hex')}`)
  const target = compactTargetToBigInt(headerBits)

  if (expectedPrevHashHex && previousHash.toLowerCase() !== expectedPrevHashHex.toLowerCase()) return { valid: false, reason: 'previous-hash-mismatch' }
  if (expectedHeight !== undefined && (!Number.isInteger(expectedHeight) || expectedHeight < 0)) return { valid: false, reason: 'invalid-height' }
  if (bits !== undefined && headerBits !== bits) return { valid: false, reason: 'difficulty-bits-mismatch' }
  if (target <= 0n || target > MAX_U32 << 224n || workValue > target) return { valid: false, reason: 'insufficient-work' }

  return { valid: true, hash: Buffer.from(hash).reverse().toString('hex'), previousHash, timestamp, bits: headerBits, nonce, target: target.toString() }
}

module.exports = { bitcoinWorkHash, compactTargetToBigInt, doubleSha256, verifyBitcoinHeader }
