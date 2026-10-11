// Wallet Connection Module
// Supports MetaMask, Phantom, WalletConnect, and other EVM/Solana wallets

class WalletManager {
  constructor() {
    this.currentWallet = null;
    this.currentAddress = null;
    this.connected = false;
    this.listeners = [];
  }

  // Subscribe to wallet events
  on(event, callback) {
    this.listeners.push({ event, callback });
  }

  emit(event, data) {
    this.listeners.forEach(({ event: e, callback }) => {
      if (e === event) callback(data);
    });
  }

  // Connect to MetaMask (Ethereum/Base/etc.)
  async connectMetaMask() {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask not installed. Please install MetaMask extension.');
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length > 0) {
        this.currentWallet = 'metamask';
        this.currentAddress = accounts[0];
        this.connected = true;
        this.emit('connected', { wallet: 'metamask', address: this.currentAddress });
        return { success: true, wallet: 'MetaMask', address: this.currentAddress };
      }
    } catch (error) {
      throw new Error(`MetaMask connection failed: ${error.message}`);
    }
  }

  // Connect to Phantom (Solana)
  async connectPhantom() {
    if (typeof window.solana === 'undefined' || !window.solana.isPhantom) {
      throw new Error('Phantom wallet not installed. Please install Phantom extension.');
    }

    try {
      const response = await window.solana.connect();
      const address = response.publicKey.toString();

      this.currentWallet = 'phantom';
      this.currentAddress = address;
      this.connected = true;
      this.emit('connected', { wallet: 'phantom', address: this.currentAddress });
      return { success: true, wallet: 'Phantom', address: this.currentAddress };
    } catch (error) {
      throw new Error(`Phantom connection failed: ${error.message}`);
    }
  }

  // Connect to WalletConnect
  async connectWalletConnect() {
    // Placeholder for WalletConnect integration
    // In production, install @walletconnect/web3-provider
    throw new Error('WalletConnect integration requires additional setup. Please use MetaMask or Phantom for now.');
  }

  // Disconnect wallet
  disconnect() {
    this.currentWallet = null;
    this.currentAddress = null;
    this.connected = false;
    this.emit('disconnected');
    return { success: true };
  }

  // Get current wallet info
  getWalletInfo() {
    return {
      connected: this.connected,
      wallet: this.currentWallet,
      address: this.currentAddress
    };
  }

  // Check if wallet is connected
  isConnected() {
    return this.connected;
  }

  // Get shortened address for display
  shortenAddress(address) {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
}

// Global wallet manager instance
const walletManager = new WalletManager();

// Make available globally
window.walletManager = walletManager;
