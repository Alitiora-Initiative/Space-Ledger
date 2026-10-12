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
  vm.runInNewContext(source, { window, Event, Uint8Array, console });
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
      'standard:connect': { async connect() { return { accounts: [account] }; } },
      'solana:signAndSendTransaction': {
        supportedTransactionVersions: ['legacy'],
        async signAndSendTransaction(input) {
          return [{ signature: new Uint8Array(64).fill(1), input }];
        }
      }
    }
  };
}

test('wallet discovery registers compatible wallets dynamically and excludes unsupported chains', () => {
  const harness = createWalletHarness();
  const wallet = standardWallet('Example Wallet');
  const mainnetOnly = standardWallet('Mainnet Wallet', 'solana:mainnet');

  harness.dispatch('wallet-standard:register-wallet', api => api.register(wallet, mainnetOnly));

  assert.deepEqual(Array.from(harness.manager.getAvailableWallets(), item => item.name), ['Example Wallet']);
});

test('Wallet Standard connect and sign-and-send preserve the Devnet legacy flow', async () => {
  const harness = createWalletHarness();
  const wallet = standardWallet('Example Wallet');
  harness.dispatch('wallet-standard:register-wallet', api => api.register(wallet));

  const connected = await harness.manager.connect(wallet);
  assert.equal(connected.wallet, 'Example Wallet');
  assert.equal(harness.manager.canSignDevnet(), true);

  const signature = await harness.manager.signAndSendTransaction({
    serialize(options) {
      assert.equal(options.requireAllSignatures, false);
      return new Uint8Array([1, 2, 3]);
    }
  });
  assert.match(signature, /^[1-9A-HJ-NP-Za-km-z]+$/);
  assert.equal(signature.length > 50, true);

  await harness.manager.disconnect();
  assert.equal(harness.manager.isConnected(), false);
});
