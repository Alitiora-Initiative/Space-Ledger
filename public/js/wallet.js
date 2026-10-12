const SOLANA_DEVNET = 'solana:devnet';
const SOLANA_SEND = 'solana:signAndSendTransaction';
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function encodeBase58(bytes) {
  let digits = [];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i += 1) {
      carry += digits[i] << 8;
      digits[i] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  let zeroes = 0;
  while (zeroes < bytes.length && bytes[zeroes] === 0) zeroes += 1;
  const encoded = digits.reverse().map(digit => BASE58_ALPHABET[digit]).join('');
  return '1'.repeat(zeroes) + encoded;
}

function standardEvent(type, detail) {
  const event = new Event(type);
  Object.defineProperty(event, 'detail', { value: detail });
  return event;
}

class WalletManager {
  constructor() {
    this.currentWallet = null;
    this.currentAddress = null;
    this.currentAccount = null;
    this.connected = false;
    this.listeners = [];
    this.provider = null;
    this.wallets = new Set();
    this._walletEventsOff = null;
    this._registryApi = Object.freeze({ register: (...wallets) => this.registerWallets(...wallets) });

    window.addEventListener('wallet-standard:register-wallet', event => {
      if (typeof event.detail === 'function') event.detail(this._registryApi);
    });
    window.dispatchEvent(standardEvent('wallet-standard:app-ready', this._registryApi));
  }

  on(event, callback) {
    this.listeners.push({ event, callback });
    return () => { this.listeners = this.listeners.filter(item => item.callback !== callback); };
  }

  emit(event, data) {
    this.listeners.forEach(({ event: registered, callback }) => {
      if (registered === event) {
        try { callback(data); } catch (error) { console.error(error); }
      }
    });
  }

  registerWallets(...wallets) {
    const added = wallets.filter(wallet => wallet && typeof wallet === 'object' && !this.wallets.has(wallet));
    added.forEach(wallet => this.wallets.add(wallet));
    if (added.length) this.emit('walletsChanged', this.getAvailableWallets());
    return () => {
      const removed = added.filter(wallet => this.wallets.delete(wallet));
      if (removed.length) this.emit('walletsChanged', this.getAvailableWallets());
    };
  }

  getAvailableWallets() {
    return [...this.wallets].filter(wallet => {
      const connect = wallet.features?.['standard:connect']?.connect;
      const send = wallet.features?.[SOLANA_SEND];
      return typeof wallet.name === 'string'
        && typeof connect === 'function'
        && wallet.chains?.includes(SOLANA_DEVNET)
        && typeof send?.signAndSendTransaction === 'function'
        && send.supportedTransactionVersions?.includes('legacy');
    });
  }

  canSignDevnet() {
    if (!this.connected || !this.provider || !this.currentAccount) return false;
    const send = this.provider.features?.[SOLANA_SEND];
    return this.provider.chains?.includes(SOLANA_DEVNET)
      && this.currentAccount.chains?.includes(SOLANA_DEVNET)
      && this.currentAccount.features?.includes(SOLANA_SEND)
      && typeof send?.signAndSendTransaction === 'function'
      && send.supportedTransactionVersions?.includes('legacy');
  }

  async connect(wallet) {
    if (!wallet || !this.getAvailableWallets().includes(wallet)) {
      throw new Error('Choose a detected wallet that supports Solana Devnet transactions.');
    }
    if (this.connected) await this.disconnect();
    const response = await wallet.features['standard:connect'].connect();
    const account = response?.accounts?.find(candidate => this._accountCanSign(wallet, candidate));
    if (!account?.address) {
      throw new Error(`${wallet.name} did not provide a Solana Devnet account with legacy transaction signing.`);
    }
    this.provider = wallet;
    this.currentAccount = account;
    this.currentWallet = wallet.name;
    this.currentAddress = account.address;
    this.connected = true;

    const events = wallet.features?.['standard:events'];
    if (typeof events?.on === 'function') {
      this._walletEventsOff = events.on('change', change => {
        if (!Array.isArray(change?.accounts)) return;
        const next = change.accounts.find(candidate => this._accountCanSign(wallet, candidate));
        if (!next) return this.disconnect(false);
        this.currentAccount = next;
        this.currentAddress = next.address;
        this.emit('connected', { wallet: wallet.name, address: next.address });
      });
    }
    this.emit('connected', { wallet: this.currentWallet, address: this.currentAddress });
    return { success: true, wallet: this.currentWallet, address: this.currentAddress };
  }

  _accountCanSign(wallet, account) {
    return Boolean(account?.address
      && account.chains?.includes(SOLANA_DEVNET)
      && account.features?.includes(SOLANA_SEND)
      && wallet.features?.[SOLANA_SEND]?.supportedTransactionVersions?.includes('legacy'));
  }

  async signAndSendTransaction(transaction, options = {}) {
    if (!this.canSignDevnet()) throw new Error('Connect a wallet that supports Solana Devnet legacy transactions.');
    const feature = this.provider.features[SOLANA_SEND];
    const serialized = new Uint8Array(transaction.serialize({ requireAllSignatures: false, verifySignatures: false }));
    const [result] = await feature.signAndSendTransaction({
      account: this.currentAccount,
      chain: SOLANA_DEVNET,
      transaction: serialized,
      options: { preflightCommitment: 'confirmed', commitment: 'confirmed', ...options }
    });
    if (typeof result?.signature === 'string') return result.signature;
    const signature = result?.signature;
    if (!signature || signature.length !== 64) throw new Error(`${this.currentWallet} did not return a valid transaction signature.`);
    return encodeBase58(signature);
  }

  async disconnect(notifyWallet = true) {
    const previousWallet = this.provider;
    const off = this._walletEventsOff;
    this._walletEventsOff = null;
    this.provider = null;
    this.currentAccount = null;
    this.currentWallet = null;
    this.currentAddress = null;
    this.connected = false;
    try { off?.(); } catch (_) { /* wallet event cleanup is best-effort */ }
    this.emit('disconnected');
    if (notifyWallet) {
      try { await previousWallet?.features?.['standard:disconnect']?.disconnect(); } catch (_) { /* wallet cleanup is best-effort */ }
    }
    return { success: true };
  }

  getWalletInfo() {
    return { connected: this.connected, wallet: this.currentWallet, address: this.currentAddress };
  }
  isConnected() { return this.connected; }
  shortenAddress(address) { return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ''; }
}

window.walletManager = new WalletManager();
