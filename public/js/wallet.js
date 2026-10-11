// Wallet Connection Module
// Supports MetaMask, Phantom, WalletConnect, and other EVM/Solana wallets

class WalletManager {
  constructor() {
    this.currentWallet = null;
    this.currentAddress = null;
    this.connected = false;
    this.listeners = [];
    this.solBalance = 0;
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

      // Fetch initial balance
      await this.updateSolBalance();

      this.emit('connected', { wallet: 'phantom', address: this.currentAddress });
      return { success: true, wallet: 'Phantom', address: this.currentAddress };
    } catch (error) {
      throw new Error(`Phantom connection failed: ${error.message}`);
    }
  }

  // Disconnect wallet
  disconnect() {
    this.currentWallet = null;
    this.currentAddress = null;
    this.connected = false;
    this.solBalance = 0;
    this.emit('disconnected');
    return { success: true };
  }

  // Get current wallet info
  getWalletInfo() {
    return {
      connected: this.connected,
      wallet: this.currentWallet,
      address: this.currentAddress,
      solBalance: this.solBalance
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

  // Update SOL balance (requires Solana web3 to be loaded)
  async updateSolBalance() {
    if (!this.connected || this.currentWallet !== 'phantom' || !this.currentAddress) {
      this.solBalance = 0;
      return 0;
    }

    try {
      // Use the same loading mechanism as solanaPayment.js
      const web3Module = await import('https://esm.sh/@solana/web3.js');
      const Connection = web3Module.Connection || (web3Module.default && web3Module.default.Connection);
      const PublicKey = web3Module.PublicKey || (web3Module.default && web3Module.default.PublicKey);

      if (!Connection || !PublicKey) {
        console.warn('Solana web3 exports not found');
        return 0;
      }

      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      const publicKey = new PublicKey(this.currentAddress);
      const balance = await connection.getBalance(publicKey);
      this.solBalance = balance / 1e9; // Convert lamports to SOL

      // Emit balance update event
      this.emit('balanceUpdated', { solBalance: this.solBalance });

      return this.solBalance;
    } catch (error) {
      console.error('Error fetching SOL balance:', error);
      this.solBalance = 0;
      return 0;
    }
  }

  // Get all token balances (SOL, USDC, USDT)
  async getAllBalances() {
    if (!this.connected || this.currentWallet !== 'phantom' || !this.currentAddress) {
      return { sol: 0, usdc: 0, usdt: 0 };
    }

    try {
      const [web3Module, splTokenModule] = await Promise.all([
        import('https://esm.sh/@solana/web3.js'),
        import('https://esm.sh/@solana/spl-token')
      ]);

      const Connection = web3Module.Connection || (web3Module.default && web3Module.default.Connection);
      const PublicKey = web3Module.PublicKey || (web3Module.default && web3Module.default.PublicKey);
      const getATA = splTokenModule.getAssociatedTokenAddressSync
        || (splTokenModule.default && splTokenModule.default.getAssociatedTokenAddressSync);

      if (!Connection || !PublicKey || !getATA) {
        console.warn('Solana web3 exports not found');
        return { sol: 0, usdc: 0, usdt: 0 };
      }

      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      const publicKey = new PublicKey(this.currentAddress);

      // Get SOL balance
      const solBalanceLamports = await connection.getBalance(publicKey);
      const solBalance = solBalanceLamports / 1e9;

      // Get SPL token addresses
      const usdcMintDevnet = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
      const usdtMintMainnet = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';

      // Get token balances
      let usdcBalance = 0;
      let usdtBalance = 0;

      try {
        const usdcAta = getATA(new PublicKey(usdcMintDevnet), publicKey);
        const usdcAccount = await connection.getTokenAccountBalance(usdcAta);
        usdcBalance = parseFloat(usdcAccount.value.amount) / 1e6; // USDC has 6 decimals
      } catch (e) {
        // Token account might not exist
        usdcBalance = 0;
      }

      try {
        const usdtAta = getATA(new PublicKey(usdtMintMainnet), publicKey);
        const usdtAccount = await connection.getTokenAccountBalance(usdtAta);
        usdtBalance = parseFloat(usdtAccount.value.amount) / 1e6; // USDT has 6 decimals
      } catch (e) {
        // Token account might not exist
        usdtBalance = 0;
      }

      const balances = { sol: solBalance, usdc: usdcBalance, usdt: usdtBalance };

      // Emit balance update event
      this.emit('balanceUpdated', balances);

      return balances;
    } catch (error) {
      console.error('Error fetching token balances:', error);
      return { sol: 0, usdc: 0, usdt: 0 };
    }
  }

  // Get current SOL balance
  getSolBalance() {
    return this.solBalance;
  }
}

// Global wallet manager instance
const walletManager = new WalletManager();

// Make available globally
window.walletManager = walletManager;
