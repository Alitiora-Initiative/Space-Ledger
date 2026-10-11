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

// ── Network mode toggle (persisted in localStorage) ───────────────────────────

export function setDevnetMode(enabled) {
  localStorage.setItem('spaceledger_devnet', enabled ? 'true' : 'false');
}

export function isDevnet() {
  return localStorage.getItem('spaceledger_devnet') === 'true';
}

export function getNetworkLabel() {
  return isDevnet() ? 'Solana Devnet' : 'Solana Mainnet';
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

  const getATA = splToken.getAssociatedTokenAddressSync
    || (splToken.default && splToken.default.getAssociatedTokenAddressSync);
  const createTransferChecked = splToken.createTransferCheckedInstruction
    || (splToken.default && splToken.default.createTransferCheckedInstruction);

  if (!Connection || !PublicKey || !Transaction || !getATA || !createTransferChecked) {
    throw new Error(
      'Solana library exports not found. The esm.sh bundle may have changed. ' +
      'Please report this issue.'
    );
  }
  return { Connection, PublicKey, Transaction, getATA, createTransferChecked };
}

// ── Dry run ───────────────────────────────────────────────────────────────────

/**
 * Simulates the full payment flow without broadcasting anything on-chain.
 * Returns a fake signature. Safe to use for testing PnL and UI flows.
 */
export async function dryRunPayment(wallet, recipientStr, totalAmountUsdc) {
  if (!wallet || !wallet.publicKey) {
    throw new Error('Wallet not connected.');
  }

  const mainPaymentUnits = Math.round((totalAmountUsdc - 0.10) * 1_000_000);
  if (mainPaymentUnits <= 0) {
    throw new Error('Amount too small. Must be greater than $0.10.');
  }

  const cfg = await getConfig();

  // Simulate a 600ms network delay
  await new Promise(resolve => setTimeout(resolve, 600));

  const fakeSig = 'DRY_RUN_' + Date.now().toString(16).toUpperCase() + '_SIMULATED';

  console.log('[DRY RUN] Simulated payment (no broadcast):', {
    from:       wallet.publicKey.toString(),
    to:         recipientStr,
    feeWallet:  cfg.feeWallet,
    amount:     totalAmountUsdc,
    network:    getNetworkLabel(),
    signature:  fakeSig
  });

  return { success: true, signature: fakeSig, dryRun: true, network: getNetworkLabel() };
}

// ── Real payment ──────────────────────────────────────────────────────────────

/**
 * Routes a flat $0.10 USDC fee to the platform fee wallet (from server config)
 * and the remainder to the recipient — all in one atomic Solana transaction.
 *
 * Works with Phantom, Solflare, Backpack, and any Wallet Adapter wallet.
 * Network (devnet / mainnet) is controlled by the localStorage toggle.
 *
 * @param {Object} wallet          - Connected wallet (window.solana or useWallet())
 * @param {string} recipientStr    - Base58 recipient public key
 * @param {number} totalAmountUsdc - Total USDC (must be > 0.10)
 * @returns {{ success: boolean, signature: string, dryRun: boolean, network: string }}
 */
export async function executeUsdcPaymentWithFee(wallet, recipientStr, totalAmountUsdc) {
  if (!wallet || !wallet.publicKey) {
    throw new Error('Wallet not connected. Please connect your Solana wallet first.');
  }

  // Load config and Solana libs in parallel
  const [cfg, { web3, splToken }] = await Promise.all([
    getConfig(),
    loadSolanaModules()
  ]);

  const { Connection, PublicKey, Transaction, getATA, createTransferChecked } =
    resolveExports(web3, splToken);

  // Pick network from toggle
  const devnet       = isDevnet();
  const rpcUrl       = devnet ? cfg.solanaRpc : cfg.solanaRpc;
  const usdcMintStr  = devnet ? cfg.usdcMintDevnet : cfg.usdcMintMainnet;
  const networkLabel = getNetworkLabel();

  if (!cfg.feeWallet || cfg.feeWallet.length < 32) {
    throw new Error(
      'Fee wallet address is not configured on the server. ' +
      'Set FEE_WALLET_ADDRESS in .env and restart the server.'
    );
  }

  const USDC_MINT_PK    = new PublicKey(usdcMintStr);
  const FEE_WALLET_PK   = new PublicKey(cfg.feeWallet);
  const userPublicKey   = wallet.publicKey;
  const recipientPK     = new PublicKey(recipientStr);

  // Derive Associated Token Accounts
  const userAta      = getATA(USDC_MINT_PK, userPublicKey);
  const feeAta       = getATA(USDC_MINT_PK, FEE_WALLET_PK);
  const recipientAta = getATA(USDC_MINT_PK, recipientPK);

  const decimals         = 6;
  const feeUnits         = Math.round(cfg.platformFeeUsd * 1_000_000);
  const mainPaymentUnits = Math.round((totalAmountUsdc - cfg.platformFeeUsd) * 1_000_000);

  if (mainPaymentUnits <= 0) {
    throw new Error(
      'Amount too small. Must be greater than $' + cfg.platformFeeUsd + ' to cover the platform fee.'
    );
  }

  const connection = new Connection(rpcUrl, 'confirmed');
  const transaction = new Transaction();

  // Instruction A — platform fee
  transaction.add(
    createTransferChecked(userAta, USDC_MINT_PK, feeAta, userPublicKey, feeUnits, decimals)
  );

  // Instruction B — payment to recipient
  transaction.add(
    createTransferChecked(userAta, USDC_MINT_PK, recipientAta, userPublicKey, mainPaymentUnits, decimals)
  );

  transaction.feePayer = userPublicKey;

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;

  try {
    // Single wallet approval prompt showing both transfers
    const signedTx = await wallet.signTransaction(transaction);

    const txSignature = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed'
    });

    await connection.confirmTransaction(
      { blockhash, lastValidBlockHeight, signature: txSignature },
      'confirmed'
    );

    return { success: true, signature: txSignature, dryRun: false, network: networkLabel };

  } catch (error) {
    console.error('Solana USDC payment failed:', error);
    throw error;
  }
}
