'use strict';

/** Optional builder support — separate from Devnet purchase treasury. */
const GOAL_SOL = 10;
const MIN_SOL = 0.0001;
const SOL_ADDRESS = 'ETuGxX6Znxr9q59THJtcYDJKt6RvCfN7wp79tRnbG1xG';
const ARB_ADDRESS = '0x7CaC4214A4842c30D1E19adab492F62fAE449bed';
const BTC_ADDRESS = 'bc1q9sadwz9aymgj9sw3xhfjxtw9zser6tgqp8xm8t';

const MAINNET_RPC = process.env.SOLANA_RPC_MAINNET || 'https://api.mainnet-beta.solana.com';
const ARB_RPC = process.env.ARB_RPC || 'https://arb1.arbitrum.io/rpc';

async function fetchJson(url, options, timeoutMs = 8_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function solBalance() {
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'getBalance',
    params: [SOL_ADDRESS, { commitment: 'confirmed' }],
  };
  const data = await fetchJson(MAINNET_RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (data.error) throw new Error(data.error.message || 'Solana RPC error');
  const lamports = Number(data.result?.value || 0);
  return lamports / 1e9;
}

async function arbEthBalance() {
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'eth_getBalance',
    params: [ARB_ADDRESS, 'latest'],
  };
  const data = await fetchJson(ARB_RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (data.error) throw new Error(data.error.message || 'Arbitrum RPC error');
  const wei = BigInt(data.result || '0x0');
  return Number(wei) / 1e18;
}

async function pricesUsd() {
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=solana,ethereum,bitcoin&vs_currencies=usd';
  const data = await fetchJson(url, {}, 8_000);
  return {
    sol: Number(data?.solana?.usd) || 0,
    eth: Number(data?.ethereum?.usd) || 0,
    btc: Number(data?.bitcoin?.usd) || 0,
  };
}

async function btcBalance() {
  try {
    const data = await fetchJson(`https://blockstream.info/api/address/${BTC_ADDRESS}`, {}, 8_000);
    const funded = Number(data?.chain_stats?.funded_txo_sum || 0);
    const spent = Number(data?.chain_stats?.spent_txo_sum || 0);
    const sats = Math.max(0, funded - spent);
    return sats / 1e8;
  } catch {
    return null;
  }
}

async function getProgress() {
  const [sol, eth, btc, px] = await Promise.all([
    solBalance().catch(() => null),
    arbEthBalance().catch(() => null),
    btcBalance().catch(() => null),
    pricesUsd().catch(() => ({ sol: 0, eth: 0, btc: 0 })),
  ]);

  let raisedSol = 0;
  const breakdown = {
    solana: { address: SOL_ADDRESS, balance: sol, unit: 'SOL', towardGoalSol: 0 },
    arbitrum: { address: ARB_ADDRESS, balance: eth, unit: 'ETH', towardGoalSol: 0 },
    bitcoin: { address: BTC_ADDRESS, balance: btc, unit: 'BTC', towardGoalSol: 0 },
  };

  if (sol != null && Number.isFinite(sol)) {
    breakdown.solana.towardGoalSol = sol;
    raisedSol += sol;
  }
  if (eth != null && Number.isFinite(eth) && px.sol > 0 && px.eth > 0) {
    const asSol = (eth * px.eth) / px.sol;
    breakdown.arbitrum.towardGoalSol = asSol;
    raisedSol += asSol;
  }
  if (btc != null && Number.isFinite(btc) && px.sol > 0 && px.btc > 0) {
    const asSol = (btc * px.btc) / px.sol;
    breakdown.bitcoin.towardGoalSol = asSol;
    raisedSol += asSol;
  }

  const capped = Math.min(raisedSol, GOAL_SOL);
  const percent = GOAL_SOL > 0 ? Math.min(100, (capped / GOAL_SOL) * 100) : 0;
  const displayRaised = raisedSol < MIN_SOL && raisedSol > 0 ? MIN_SOL : raisedSol;

  return {
    goalSol: GOAL_SOL,
    minDisplaySol: MIN_SOL,
    raisedSolApprox: Number(raisedSol.toFixed(6)),
    displayRaisedSol: Number(displayRaised.toFixed(6)),
    percent: Number(percent.toFixed(2)),
    complete: raisedSol >= GOAL_SOL,
    pricesUsd: px,
    breakdown,
    note: 'Optional support only. Balances are read live from public RPCs. Arbitrum ETH and Bitcoin are converted to SOL-equivalent using public USD prices when available. Not an investment.',
    updatedAt: new Date().toISOString(),
  };
}

module.exports = { getProgress, GOAL_SOL, SOL_ADDRESS, ARB_ADDRESS, BTC_ADDRESS };
