const test = require('node:test');
const assert = require('node:assert/strict');
const { getConfig } = require('../src/networkConfig');

test('development defaults to Devnet without silently selecting Mainnet', () => {
  const config = getConfig({});
  assert.equal(config.network, 'devnet');
  assert.equal(config.rpcUrl, 'https://api.devnet.solana.com');
});

test('Mainnet configuration fails closed until every production identity is supplied', () => {
  assert.throws(
    () => getConfig({ SOLANA_NETWORK: 'mainnet-beta', SOLANA_RPC_URL: 'https://api.mainnet-beta.solana.com' }),
    /Mainnet configuration is incomplete/
  );
});

test('Mainnet configuration accepts explicit production identities', () => {
  const config = getConfig({
    SOLANA_NETWORK: 'mainnet-beta',
    SOLANA_RPC_URL: 'https://api.mainnet-beta.solana.com',
    SOLANA_PROGRAM_ID: '11111111111111111111111111111111',
    FEE_WALLET_ADDRESS: '11111111111111111111111111111111',
    SOLANA_USDC_MINT: '11111111111111111111111111111111',
    SOLANA_PYTH_PROGRAM: '11111111111111111111111111111111',
    SOLANA_SOL_USD_FEED: '11111111111111111111111111111111',
    SOLANA_SOL_USD_FEED_ID: '00'.repeat(32),
  });
  assert.equal(config.network, 'mainnet-beta');
  assert.equal(config.rpcUrl, 'https://api.mainnet-beta.solana.com');
});
