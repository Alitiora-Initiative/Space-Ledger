'use strict';

const NETWORKS = new Set(['devnet', 'mainnet-beta']);

function getNetwork(env = process.env) {
  const network = String(env.SOLANA_NETWORK || (process.env.NODE_ENV === 'production' ? '' : 'devnet')).trim();
  if (!NETWORKS.has(network)) {
    throw new Error('SOLANA_NETWORK must be explicitly set to devnet or mainnet-beta.');
  }
  return network;
}

function getConfig(env = process.env) {
  const network = getNetwork(env);
  const rpcUrl = String(env.SOLANA_RPC_URL || (network === 'devnet' ? env.SOLANA_RPC_DEVNET || 'https://api.devnet.solana.com' : '')).trim();
  const programId = String(env.SOLANA_PROGRAM_ID || '').trim();
  const treasury = String(env.FEE_WALLET_ADDRESS || '').trim();
  const usdcMint = String(env.SOLANA_USDC_MINT || (network === 'devnet' ? '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU' : '')).trim();
  const pythProgram = String(env.SOLANA_PYTH_PROGRAM || (network === 'devnet' ? 'rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ' : '')).trim();
  const solUsdFeed = String(env.SOLANA_SOL_USD_FEED || (network === 'devnet' ? '7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE' : '')).trim();
  const solUsdFeedId = String(env.SOLANA_SOL_USD_FEED_ID || (network === 'devnet' ? 'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d' : '')).trim();
  if (network === 'mainnet-beta' && (!rpcUrl || !programId || !treasury || !usdcMint || !pythProgram || !solUsdFeed || !solUsdFeedId)) {
    throw new Error('Mainnet configuration is incomplete: set SOLANA_RPC_URL, SOLANA_PROGRAM_ID, FEE_WALLET_ADDRESS, SOLANA_USDC_MINT, SOLANA_PYTH_PROGRAM, SOLANA_SOL_USD_FEED, and SOLANA_SOL_USD_FEED_ID.');
  }
  return Object.freeze({ network, rpcUrl, programId, treasury, usdcMint, pythProgram, solUsdFeed, solUsdFeedId });
}

module.exports = { getConfig, getNetwork };
