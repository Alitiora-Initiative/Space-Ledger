const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'wallet.js'), 'utf8');

function createWalletHarness() {
  const handlers = new Map();
  const appEvents = [];
  const window = {
    addEventListener(type, handler) {
      const listeners = handlers.get(type) || [];
      listeners.push(handler);
      handlers.set(type, listeners);
    },
    dispatchEvent(event) {
      appEvents.push(event);
      (handlers.get(event.type) || []).forEach(handler => handler(event));
      return true;
    }
  };
  vm.runInNewContext(source, { window, Event, Uint8Array, console, setTimeout, clearTimeout });
  return {
    manager: window.walletManager,
    appReady: appEvents.find(event => event.type === 'wallet-standard:app-ready'),
    dispatch(type, detail) {
      const event = new Event(type);
      Object.defineProperty(event, 'detail', { value: detail });
      window.dispatchEvent(event);
    }
  };
}

function standardWallet(name, chain = 'solana:devnet') {
  const account = {
    address: '11111111111111111111111111111111',
    chains: [chain],
    features: ['solana:signAndSendTransaction']
  };
  return {
    name,
    chains: [chain],
    features: {
      'standard:connect': {
        connect: async () => ({ accounts: [account] })
      },
      'solana:signAndSendTransaction': {
        signAndSendTransaction: async () => ({ signature: 'test-signature' })
      }
    },
    accounts: [account]
  };
}

test('wallet discovery registers compatible wallets dynamically and excludes unsupported chains', () => {
  const harness = createWalletHarness();
  const wallet = standardWallet('Example Wallet');
  const mainnetOnly = standardWallet('Mainnet Wallet', 'solana:mainnet');

  harness.dispatch('wallet-standard:register-wallet', api => api.register(wallet, mainnetOnly));

  const names = Array.from(harness.manager.getAvailableWallets(), item => item.name);
  assert.ok(names.includes('Example Wallet'));
  assert.ok(names.includes('Mainnet Wallet')); // listed; sign path still uses Devnet
});

test('Wallet Standard connect and sign-and-send preserve the Devnet legacy flow', async () => {
  const harness = createWalletHarness();
  const wallet = standardWallet('Example Wallet');
  harness.dispatch('wallet-standard:register-wallet', api => api.register(wallet));

  const connected = await harness.manager.connect(wallet);
  assert.equal(connected.wallet, 'Example Wallet');
  assert.ok(harness.manager.canSignDevnet());
});
