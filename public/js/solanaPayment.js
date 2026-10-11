// public/js/solanaPayment.js
// Browser ESM — imported via <script type="module">
//
// All sensitive config (fee wallet, network, RPC URL) is fetched from
// the backend /api/config endpoint. Nothing sensitive is hardcoded here.

// ── Config (fetched from backend once, then cached) ───────────────────────────

let _config = null;

async function getConfig() {
  if (_config) return _config;
  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    _config = await res.json();
    return _config;
  } catch (err) {
    throw new Error('Failed to load server config: ' + err.message);
  }
}

// ── Lazy-load Solana modules from esm.sh ──────────────────────────────────────

let _web3     = null;
let _splToken = null;

async function loadSolanaModules() {
  if (_web3 && _splToken) return { web3: _web3, splToken: _splToken };
  try {
    [_web3, _splToken] = await Promise.all([
      import('https://esm.sh/@solana/web3.js'),
      import('https://esm.sh/@solana/spl-token')
    ]);
    return { web3: _web3, splToken: _splToken };
  } catch (err) {
    throw new Error(
      'Failed to load Solana libraries from esm.sh. ' +
      'Check your internet connection or ad-blocker. Detail: ' + err.message
    );
  }
}

function resolveExports(web3, splToken) {
  const Connection  = web3.Connection  || (web3.default && web3.default.Connection);
  const PublicKey   = web3.PublicKey   || (web3.default && web3.default.PublicKey);
  const Transaction = web3.Transaction || (web3.default && web3.default.Transaction);
  const SystemProgram = web3.SystemProgram || (web3.default && web3.default.SystemProgram);

  const getATA = splToken.getAssociatedTokenAddressSync
    || (splToken.default && splToken.default.getAssociatedTokenAddressSync);
  const createTransferChecked = splToken.createTransferCheckedInstruction
    || (splToken.default && splToken.default.createTransferCheckedInstruction);

  if (!Connection || !PublicKey || !Transaction || !SystemProgram || !getATA || !createTransferChecked) {
    throw new Error(
      'Solana library exports not found. The esm.sh bundle may have changed. ' +
      'Please report this issue.'
    );
  }
  return { Connection, PublicKey, Transaction, SystemProgram, getATA, createTransferChecked };
}

// ── Jupiter price feed ────────────────────────────────────────────────────────

/**
 * Fetches current USD prices for SOL, USDC, and USDT from the Jupiter price API.
 * @returns {{ SOL: object, USDC: object, USDT: object }}
 */
export async function fetchJupiterPrices() {
  try {
    const res = await fetch('https://price.jup.ag/v4/price?ids=SOL,USDC,USDT');
    if (!res.ok) throw new Error('Jupiter API returned HTTP ' + res.status);
    const data = await res.json();
    if (!data || !data.data) throw new Error('Unexpected Jupiter API response shape');
    return {
      SOL:  data.data.SOL,
      USDC: data.data.USDC,
      USDT: data.data.USDT
    };
  } catch (err) {
    throw new Error('Failed to fetch Jupiter prices: ' + err.message);
  }
}

// ── Real payment ──────────────────────────────────────────────────────────────

const USDT_MINT_MAINNET = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';

/**
 * Executes a real on-chain payment via Phantom's signAndSendTransaction.
 * Supports SOL (SystemProgram.transfer), USDC, and USDT (SPL createTransferChecked).
 * All fees are routed to the platform fee wallet automatically.
 *
 * @param {Object} wallet    - Connected wallet (window.solana / window.phantom.solana)
 * @param {string} currency  - 'SOL' | 'USDC' | 'USDT'
 * @param {number} usdAmount - Total USD amount to pay (subtotal + platform fee)
 * @returns {{ success: boolean, signature: string, network: string }}
 */
export async function executePayment(wallet, currency, usdAmount) {
  if (!wallet || !wallet.publicKey) {
    throw new Error('Wallet not connected. Please connect your Solana wallet first.');
  }

  // Load config and Solana libs in parallel
  const [cfg, { web3, splToken }] = await Promise.all([
    getConfig(),
    loadSolanaModules()
  ]);

  const { Connection, PublicKey, Transaction, SystemProgram, getATA, createTransferChecked } =
    resolveExports(web3, splToken);

  if (!cfg.feeWallet || cfg.feeWallet.length < 32) {
    throw new Error(
      'Fee wallet address is not configured on the server. ' +
      'Set FEE_WALLET_ADDRESS in .env and restart the server.'
    );
  }

  const connection    = new Connection(cfg.solanaRpc, 'confirmed');
  const transaction   = new Transaction();
  const userPublicKey = wallet.publicKey;
  const feeWalletPK   = new PublicKey(cfg.feeWallet);

  if (currency === 'SOL') {
    // Fetch live SOL price and convert USD amount to lamports
    const prices = await fetchJupiterPrices();
    if (!prices.SOL || !prices.SOL.price) throw new Error('Could not fetch SOL price from Jupiter');
    const lamports = Math.round((usdAmount / prices.SOL.price) * 1e9);
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: userPublicKey,
        toPubkey:   feeWalletPK,
        lamports
      })
    );

  } else if (currency === 'USDC' || currency === 'USDT') {
    const mintStr = currency === 'USDC'
      ? cfg.usdcMintMainnet
      : USDT_MINT_MAINNET;

    const mintPK  = new PublicKey(mintStr);
    const userAta = getATA(mintPK, userPublicKey);
    const feeAta  = getATA(mintPK, feeWalletPK);
    const amount  = Math.round(usdAmount * 1_000_000); // 6 decimals

    transaction.add(
      createTransferChecked(userAta, mintPK, feeAta, userPublicKey, amount, 6)
    );

  } else {
    throw new Error('Unsupported currency: ' + currency + '. Use SOL, USDC, or USDT.');
  }

  transaction.feePayer = userPublicKey;

  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;

  // Phantom returns { signature } directly from signAndSendTransaction
  const result = await wallet.signAndSendTransaction(transaction);

  return {
    success:   true,
    signature: result.signature,
    network:   cfg.solanaNetwork
  };
}

// ── Sell blocks (send SOL to user) ──────────────────────────────────────────────

/**
 * Executes a real on-chain transaction to send SOL from fee wallet to user (selling blocks).
 * This requires the fee wallet to sign and send the transaction.
 *
 * @param {Object} wallet    - Connected wallet (window.solana / window.phantom.solana)
 * @param {number} usdAmount - USD amount to receive for the sold block
 * @returns {{ success: boolean, signature: string, network: string, solAmount: number }}
 */
export async function executeSell(wallet, usdAmount) {
  if (!wallet || !wallet.publicKey) {
    throw new Error('Wallet not connected. Please connect your Solana wallet first.');
  }

  // Load config and Solana libs in parallel
  const [cfg, { web3, splToken }] = await Promise.all([
    getConfig(),
    loadSolanaModules()
  ]);

  const { Connection, PublicKey, Transaction, SystemProgram } =
    resolveExports(web3, splToken);

  if (!cfg.feeWallet || cfg.feeWallet.length < 32) {
    throw new Error(
      'Fee wallet address is not configured on the server. ' +
      'Set FEE_WALLET_ADDRESS in .env and restart the server.'
    );
  }

  const connection    = new Connection(cfg.solanaRpc, 'confirmed');
  const userPublicKey = wallet.publicKey;
  const feeWalletPK   = new PublicKey(cfg.feeWallet);

  // Fetch live SOL price and convert USD amount to lamports
  const prices = await fetchJupiterPrices();
  if (!prices.SOL || !prices.SOL.price) throw new Error('Could not fetch SOL price from Jupiter');
  const lamports = Math.round((usdAmount / prices.SOL.price) * 1e9);
  const solAmount = lamports / 1e9;

  // Check if fee wallet has enough balance (in a real implementation, this would be done server-side)
  const feeWalletBalance = await connection.getBalance(feeWalletPK);
  if (feeWalletBalance < lamports) {
    throw new Error('Insufficient funds in fee wallet to complete sale. Contact support.');
  }

  // Create transaction to send SOL from fee wallet to user
  // NOTE: In production, this should be done server-side with the fee wallet's private key
  // For this demo, we'll simulate it by asking the user to approve a reverse transaction
  const transaction = new Transaction();
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: feeWalletPK,
      toPubkey:   userPublicKey,
      lamports
    })
  );

  transaction.feePayer = userPublicKey;

  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;

  // For demo: This would require server-side signing in production
  // Currently, this will fail because the user cannot sign for the fee wallet
  // We'll return a simulated success for testing purposes
  throw new Error(
    'Server-side sell transaction not implemented. ' +
    'In production, the server would sign and send SOL from the fee wallet to the user. ' +
    'Amount: ' + solAmount.toFixed(6) + ' SOL ($' + usdAmount.toFixed(6) + ')'
  );
}
