// Read-only wallet identity connection. This module never requests a signature
// and never submits a transaction.
class WalletManager {
  constructor() {
    this.currentWallet = null;
    this.currentAddress = null;
    this.connected = false;
    this.listeners = [];
    this.provider = null;
    this._providerEvents = null;
  }

  on(event, callback) { this.listeners.push({ event, callback }); }
  emit(event, data) {
    this.listeners.forEach(({ event: registered, callback }) => {
      if (registered === event) callback(data);
    });
  }

  getMetaMaskProvider() {
    const root = window.ethereum;
    const providers = root?.providers || (root ? [root] : []);
    return providers.find(provider => provider.isMetaMask && !provider.isBraveWallet) || null;
  }

  attach(provider, wallet, address) {
    this.detachListeners();
    this.provider = provider;
    this.currentWallet = wallet;
    this.currentAddress = address;
    this.connected = true;
    this._providerEvents = {
      accountsChanged: accounts => {
        if (!accounts || !accounts.length) return this.disconnect(false);
        this.currentAddress = accounts[0];
        this.emit('connected', { wallet: this.currentWallet, address: this.currentAddress });
      },
      disconnect: () => this.disconnect(false),
      accountChanged: publicKey => {
        if (!publicKey) return this.disconnect(false);
        const nextAddress = publicKey.toString();
        this.currentAddress = nextAddress;
        this.emit('connected', { wallet: this.currentWallet, address: nextAddress });
      }
    };
    provider.on?.('accountsChanged', this._providerEvents.accountsChanged);
    provider.on?.('disconnect', this._providerEvents.disconnect);
    provider.on?.('accountChanged', this._providerEvents.accountChanged);
    this.emit('connected', { wallet, address });
    return { success: true, wallet, address };
  }

  detachListeners() {
    if (this.provider && this._providerEvents) {
      this.provider.removeListener?.('accountsChanged', this._providerEvents.accountsChanged);
      this.provider.removeListener?.('disconnect', this._providerEvents.disconnect);
      this.provider.removeListener?.('accountChanged', this._providerEvents.accountChanged);
    }
    this._providerEvents = null;
  }

  async connectMetaMask() {
    const provider = this.getMetaMaskProvider();
    if (!provider) throw new Error('MetaMask was not detected. Install the official MetaMask extension, then reload.');
    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (!Array.isArray(accounts) || !accounts[0]) throw new Error('MetaMask did not return an account.');
      return this.attach(provider, 'metamask', accounts[0]);
    } catch (error) {
      throw new Error(`MetaMask connection failed: ${error.message}`);
    }
  }

  async connectPhantom() {
    const provider = window.phantom?.solana || (window.solana?.isPhantom ? window.solana : null);
    if (!provider?.isPhantom) throw new Error('Phantom was not detected. Install the official Phantom extension, then reload.');
    try {
      const response = await provider.connect();
      const address = response?.publicKey?.toString();
      if (!address) throw new Error('Phantom did not return an account.');
      return this.attach(provider, 'phantom', address);
    } catch (error) {
      throw new Error(`Phantom connection failed: ${error.message}`);
    }
  }

  disconnect(notifyProvider = true) {
    const previousProvider = this.provider;
    const previousWallet = this.currentWallet;
    this.detachListeners();
    this.provider = null;
    this.currentWallet = null;
    this.currentAddress = null;
    this.connected = false;
    if (notifyProvider && previousWallet === 'phantom') {
      try { previousProvider?.disconnect?.(); } catch (_) { /* provider cleanup is best-effort */ }
    }
    this.emit('disconnected');
    return { success: true };
  }

  getWalletInfo() {
    return { connected: this.connected, wallet: this.currentWallet, address: this.currentAddress };
  }
  isConnected() { return this.connected; }
  shortenAddress(address) { return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ''; }
}

window.walletManager = new WalletManager();
