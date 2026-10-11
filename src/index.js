require('dotenv').config();
const express = require('express');
const path = require('path');
const bondingCurve = require('./bondingCurve');
const treasury = require('./treasury');
const rpcRouter = require('./rpcRouter');
const backgroundProcesses = require('./backgroundProcesses');
const db = require('./supabase');

// ── Server config from env ────────────────────────────────────────────────────
const PORT           = parseInt(process.env.PORT) || 3000;
const SOLANA_NETWORK = process.env.SOLANA_NETWORK || 'devnet';
const SOLANA_RPC     = SOLANA_NETWORK === 'mainnet-beta'
  ? (process.env.SOLANA_RPC_MAINNET || 'https://api.mainnet-beta.solana.com')
  : (process.env.SOLANA_RPC_DEVNET  || 'https://api.devnet.solana.com');

// Fee wallet is read from env — never hardcoded or sent directly to the browser
const FEE_WALLET_ADDRESS = process.env.FEE_WALLET_ADDRESS || '';

if (!FEE_WALLET_ADDRESS) {
  console.warn('⚠️  FEE_WALLET_ADDRESS not set in .env — fee routing disabled');
}

// In-memory fallback when Supabase is not configured
const ownershipMap = new Map();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ── Public config endpoint ────────────────────────────────────────────────────
// Exposes only what the browser legitimately needs.
// The Supabase service key is NEVER included here.
app.get('/api/config', (req, res) => {
  res.json({
    solanaNetwork:   SOLANA_NETWORK,
    solanaRpc:       SOLANA_RPC,
    feeWallet:       FEE_WALLET_ADDRESS,  // public wallet address — safe to share
    usdcMintMainnet: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    usdcMintDevnet:  '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    platformFeeUsd:  0.10,
    totalBlocks:     bondingCurve.TOTAL_SUPPLY,
  });
});

// Bonding curve endpoints
// NOTE: /api/price/range MUST be defined before /api/price/:supply
// so Express doesn't match the literal string 'range' as the :supply param
app.get('/api/price/range', (req, res) => {
  const start = parseInt(req.query.start) || 0;
  const rawCount = parseInt(req.query.count) || 1;
  const count = Math.min(rawCount, 100);
  const result = [];
  for (let i = 0; i < count; i++) {
    const blockId = start + i;
    result.push({ blockId, price: bondingCurve.calculatePrice(blockId) });
  }
  res.json(result);
});

app.get('/api/price/:supply', (req, res) => {
  const supply = parseInt(req.params.supply);
  const price = bondingCurve.calculatePrice(supply);
  res.json({ supply, price });
});

app.get('/api/supply', (req, res) => {
  res.json({ totalSupply: bondingCurve.TOTAL_SUPPLY, currentSupply: bondingCurve.getCurrentSupply() });
});

// Treasury endpoints
app.get('/api/treasury', (req, res) => {
  res.json(treasury.getTreasuryStatus());
});

// Vesting status (read-only - automatic backend process)
app.get('/api/vesting-status', (req, res) => {
  res.json(backgroundProcesses.getVestingStatus());
});

// Multi-chain RPC routing
app.post('/api/rpc', async (req, res) => {
  const { networkId, method, params } = req.body;
  try {
    const result = await rpcRouter.routeRequest(networkId, method, params);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/networks', (req, res) => {
  res.json(rpcRouter.getNetworks());
});

// Block clustering endpoint
app.get('/api/grid', (req, res) => {
  const blockId = req.query.block ? parseInt(req.query.block) : 0;
  const grid = generateGrid(blockId);
  res.json(grid);
});

// Return blocks owned by a wallet address
// Tries Supabase first; falls back to in-memory map
app.get('/api/blocks/:address', async (req, res) => {
  const addr = req.params.address.toLowerCase();

  // Try Supabase
  const dbBlocks = await db.getBlocksByAddress(addr);
  if (dbBlocks !== null) return res.json(dbBlocks);

  // Fallback: in-memory
  res.json(ownershipMap.get(addr) || []);
});

// Purchase endpoint with automatic fee collection
app.post('/api/purchase', async (req, res) => {
  const { walletAddress, blockId, blockCount, network, txSignature } = req.body;
  
  // Calculate total price
  let totalPrice = 0;
  for (let i = 0; i < blockCount; i++) {
    totalPrice += bondingCurve.calculatePrice(blockId + i);
  }
  
  // Automatically collect fee
  const feeResult = backgroundProcesses.collectTransactionFee(totalPrice);
  
  // Update supply
  bondingCurve.updateSupply(blockCount);

  // Record in Supabase (async, non-blocking — failures don't break the response)
  db.recordPurchase(
    walletAddress,
    blockId,
    blockCount,
    totalPrice,
    bondingCurve.calculatePrice,
    network || 'demo',
    txSignature || null
  ).catch(err => console.error('Supabase recordPurchase error:', err.message));

  // Also record in in-memory map as fallback / for same-session reads
  const key = (walletAddress || '').toLowerCase();
  if (!ownershipMap.has(key)) ownershipMap.set(key, []);
  const owned = ownershipMap.get(key);
  for (let i = 0; i < blockCount; i++) {
    owned.push({
      blockId:       blockId + i,
      purchasePrice: bondingCurve.calculatePrice(blockId + i),
      timestamp:     Date.now(),
      network:       network || 'demo'
    });
  }
  
  res.json({
    success: true,
    walletAddress,
    blockId,
    blockCount,
    totalPrice,
    feeCollected:      feeResult.feeCollected,
    totalCollectedFees: feeResult.totalCollected,
    network,
    pixels: blockCount * 100
  });
});

// Portfolio summary (from Supabase view)
app.get('/api/portfolio/:address', async (req, res) => {
  const addr = req.params.address.toLowerCase();
  const summary = await db.getPortfolioSummary(addr);
  if (summary) return res.json(summary);

  // Fallback: compute from in-memory
  const blocks = ownershipMap.get(addr) || [];
  const totalInvested = blocks.reduce((s, b) => s + b.purchasePrice, 0);
  const currentValue  = blocks.reduce((s, b) => s + bondingCurve.calculatePrice(b.blockId), 0);
  res.json({
    owner_address:  addr,
    total_blocks:   blocks.length,
    total_pixels:   blocks.length * 100,
    total_invested: totalInvested,
    current_value:  currentValue,
    unrealized_pnl: currentValue - totalInvested
  });
});

app.listen(PORT, () => {
  console.log(`Space Ledger server running on http://localhost:${PORT}`);
  console.log(`  Solana network: ${SOLANA_NETWORK}`);
  console.log(`  Fee wallet:     ${FEE_WALLET_ADDRESS || '(not set)'}`);
  console.log(`  Supabase:       ${db.connected ? 'connected ✓' : 'memory-only mode'}`);
});

function generateGrid(blockId) {
  const gridSize = 10;
  const grid = [];
  for (let i = 0; i < gridSize; i++) {
    const row = [];
    for (let j = 0; j < gridSize; j++) {
      const index = blockId * 100 + i * 10 + j;
      const price = bondingCurve.calculatePrice(index);
      row.push({
        index,
        price,
        available: index < bondingCurve.getCurrentSupply()
      });
    }
    grid.push(row);
  }
  return { blockId, grid };
}
