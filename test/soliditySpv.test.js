const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const solc = require('solc')

test('BitcoinSpv compiles with the pinned Solidity compiler', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'contracts', 'BitcoinSpv.sol'), 'utf8')
  const input = {
    language: 'Solidity',
    sources: { 'BitcoinSpv.sol': { content: source } },
    settings: { outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } } },
  }
  const output = JSON.parse(solc.compile(JSON.stringify(input)))
  const errors = (output.errors || []).filter((error) => error.severity === 'error')
  assert.deepEqual(errors, [])
  assert.ok(output.contracts['BitcoinSpv.sol'].BitcoinSpv.abi.length > 0)
})
