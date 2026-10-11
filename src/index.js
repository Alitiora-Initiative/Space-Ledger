require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
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

// ── State persistence ─────────────────────────────────────────────────────────
const STATE_FILE = path.join(__dirname, '../data/state.json');

let totalRevenue   = 0;
let totalFees      = 0;
let lastPurchaseAt = null;

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf8');
      const state = JSON.parse(raw);
      if (typeof state.currentSupply === 'number') {
        bondingCurve.updateSupply(state.currentSupply);
      }
      if (typeof state.totalRevenue === 'number')   totalRevenue   = state.totalRevenue;
      if (typeof state.totalFees    === 'number')   totalFees      = state.totalFees;
      if (state.lastPurchaseAt)                      lastPurchaseAt = state.lastPurchaseAt;
    }
  } catch (err) {
    console.error('loadState error:', err.message);
  }
}

function saveState() {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify({
      currentSupply: bondingCurve.getCurrentSupply(),
      totalRevenue,
      totalFees,
      lastPurchaseAt
    }));
  } catch (err) {
    console.error('saveState error:', err.message);
  }
}

// Load persisted state before server starts
loadState();

// ── In-memory fallback when Supabase is not configured ────────────────────────
const ownershipMap = new Map();

// ── SSE clients ───────────────────────────────────────────────────────────────
const sseClients = new Set();

function broadcastSSE(payload) {
  const msg = 'data: ' + JSON.stringify(payload) + '\n\n';
  sseClients.forEach(function (client) {
    try { client.write(msg); } catch (e) {}
  });
}

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

// ── Bonding curve endpoints ───────────────────────────────────────────────────
// NOTE: /api/price/range MUST be defined before /api/price/:supply
// so Express doesn't match the literal string 'range' as the :supply param
app.get('/api/price/range', (req, res) => {
  const start    = parseInt(req.query.start) || 0;
  const rawCount = parseInt(req.query.count) || 1;
  const count    = Math.min(rawCount, 100);
  const result   = [];
  for (let i = 0; i < count; i++) {
    const blockId = start + i;
    result.push({ blockId, price: bondingCurve.calculatePrice(blockId) });
  }
  res.json(result);
});

app.get('/api/price/:supply', (req, res) => {
  const supply = parseInt(req.params.supply);
  const price  = bondingCurve.calculatePrice(supply);
  res.json({ supply, price });
});

app.get('/api/supply', (req, res) => {
  res.json({ totalSupply: bondingCurve.TOTAL_SUPPLY, currentSupply: bondingCurve.getCurrentSupply() });
});

// ── Treasury endpoints ────────────────────────────────────────────────────────
app.get('/api/treasury', (req, res) => {
  res.json(treasury.getTreasuryStatus());
});

// ── Vesting status (read-only — automatic backend process) ────────────────────
app.get('/api/vesting-status', (req, res) => {
  res.json(backgroundProcesses.getVestingStatus());
});

// ── Multi-chain RPC routing ───────────────────────────────────────────────────
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

// ── Block clustering endpoint ─────────────────────────────────────────────────
app.get('/api/grid', (req, res) => {
  const blockId = req.query.block ? parseInt(req.query.block) : 0;
  const grid    = generateGrid(blockId);
  res.json(grid);
});

// ── Genesis allocation info ───────────────────────────────────────────────────
app.get('/api/genesis', (req, res) => {
  res.json({
    ownerAddress:  FEE_WALLET_ADDRESS,
    startBlock:    0,
    endBlock:      999999999,
    totalBlocks:   1000000000,
    status:        'cliff',
    cliffMonths:   12,
    vestingMonths: 36
  });
});

// ── Platform stats ────────────────────────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  res.json({
    currentSupply:   bondingCurve.getCurrentSupply(),
    currentPrice:    bondingCurve.calculatePrice(bondingCurve.getCurrentSupply()),
    totalRevenue,
    totalFees,
    blocksAvailable: bondingCurve.TOTAL_SUPPLY - bondingCurve.getCurrentSupply(),
    lastPurchaseAt
  });
});

// ── Block ownership lookup ────────────────────────────────────────────────────
app.get('/api/block-owner/:blockId', (req, res) => {
  const blockId = parseInt(req.params.blockId);

  if (blockId < 1_000_000_000) {
    return res.json({
      blockId,
      owner:      'genesis',
      isGenesis:  true,
      vestingStatus: { status: 'cliff', cliffMonths: 12, vestingMonths: 36 }
    });
  }

  // Scan ownershipMap for the block
  for (const [address, blocks] of ownershipMap.entries()) {
    if (blocks.some(b => b.blockId === blockId)) {
      return res.json({ blockId, owner: address, isGenesis: false });
    }
  }

  res.json({ blockId, owner: null, isGenesis: false });
});

// ── Block-for-SOL swap (returns block to pool and sends SOL to user) ───────────
app.post('/api/swap', async (req, res) => {
  const { walletAddress, blockId, expectedSol } = req.body;

  if (!walletAddress || blockId === undefined) {
    return res.status(400).json({ error: 'walletAddress and blockId are required' });
  }

  // Verify ownership
  const key = walletAddress.toLowerCase();
  let owned = false;
  let blockData = null;

  if (ownershipMap.has(key)) {
    const userBlocks = ownershipMap.get(key);
    const blockIndex = userBlocks.findIndex(b => b.blockId === blockId);
    if (blockIndex !== -1) {
      owned = true;
      blockData = userBlocks[blockIndex];
      ownershipMap.set(key, userBlocks.filter(b => b.blockId !== blockId));
    }
  }

  if (!owned) {
    return res.status(400).json({ error: 'You do not own this block' });
  }

  // Calculate current value
  const currentValue = bondingCurve.calculatePrice(blockId);
  const purchasePrice = blockData.purchasePrice || 0;
  const pnl = currentValue - purchasePrice;

  // Remove from Supabase if connected
  if (db.connected) {
    try {
      await db.supabase.from('blocks').update({ owner_address: null }).eq('block_id', blockId);
    } catch (err) {
      console.error('swap Supabase update error:', err.message);
    }
  }

  // Decrease supply
  bondingCurve.updateSupply(-1);

  // Update persisted stats
  lastPurchaseAt = new Date().toISOString();
  saveState();

  // Broadcast updated stats to SSE subscribers
  broadcastSSE({
    currentSupply: bondingCurve.getCurrentSupply(),
    currentPrice:  bondingCurve.calculatePrice(bondingCurve.getCurrentSupply()),
    totalRevenue,
    totalFees
  });

  res.json({
    success:   true,
    blockId,
    solAmount: expectedSol || 0,
    currentValue,
    purchasePrice,
    pnl,
    message:   'Block sold. SOL transfer will be processed.'
  });
});

// ── SSE real-time stream ──────────────────────────────────────────────────────
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type',      'text/event-stream');
  res.setHeader('Cache-Control',     'no-cache');
  res.setHeader('Connection',        'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  sseClients.add(res);

  // Send current state immediately on connect
  res.write('data: ' + JSON.stringify({
    currentSupply: bondingCurve.getCurrentSupply(),
    currentPrice:  bondingCurve.calculatePrice(bondingCurve.getCurrentSupply()),
    totalRevenue,
    totalFees
  }) + '\n\n');

  req.on('close', function () {
    sseClients.delete(res);
  });
});

// ── Return blocks owned by a wallet address ───────────────────────────────────
// Tries Supabase first; falls back to in-memory map
app.get('/api/blocks/:address', async (req, res) => {
  const addr = req.params.address.toLowerCase();

  // Try Supabase
  const dbBlocks = await db.getBlocksByAddress(addr);
  if (dbBlocks !== null) return res.json(dbBlocks);

  // Fallback: in-memory
  res.json(ownershipMap.get(addr) || []);
});

// ── Purchase endpoint with automatic fee collection ───────────────────────────
app.post('/api/purchase', async (req, res) => {
  const { walletAddress, blockId, blockCount, network, txSignature } = req.body;

  // Genesis guard — blocks 0–999,999,999 are dev allocation and cannot be purchased
  if (blockId < 1_000_000_000) {
    return res.status(400).json({
      error: 'Genesis allocation — blocks 0–999,999,999 belong to the dev treasury and cannot be purchased. Public blocks start at 1,000,000,000.'
    });
  }

  // Calculate total price
  let totalPrice = 0;
  for (let i = 0; i < blockCount; i++) {
    totalPrice += bondingCurve.calculatePrice(blockId + i);
  }

  // Automatically collect fee
  const feeResult = backgroundProcesses.collectTransactionFee(totalPrice);

  // Update supply
  bondingCurve.updateSupply(blockCount);

  // Update persisted stats
  totalRevenue   += totalPrice;
  totalFees      += 0.10;
  lastPurchaseAt  = new Date().toISOString();
  saveState();

  // Broadcast updated stats to SSE subscribers
  broadcastSSE({
    currentSupply: bondingCurve.getCurrentSupply(),
    currentPrice:  bondingCurve.calculatePrice(bondingCurve.getCurrentSupply()),
    totalRevenue,
    totalFees
  });

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
    feeCollected:       feeResult.feeCollected,
    totalCollectedFees: feeResult.totalCollected,
    network,
    pixels: blockCount * 100
  });
});

// ── Portfolio summary (from Supabase view) ────────────────────────────────────
app.get('/api/portfolio/:address', async (req, res) => {
  const addr    = req.params.address.toLowerCase();
  const summary = await db.getPortfolioSummary(addr);
  if (summary) return res.json(summary);

  // Fallback: compute from in-memory
  const blocks         = ownershipMap.get(addr) || [];
  const totalInvested  = blocks.reduce((s, b) => s + b.purchasePrice, 0);
  const currentValue   = blocks.reduce((s, b) => s + bondingCurve.calculatePrice(b.blockId), 0);
  res.json({
    owner_address:  addr,
    total_blocks:   blocks.length,
    total_pixels:   blocks.length * 100,
    total_invested: totalInvested,
    current_value:  currentValue,
    unrealized_pnl: currentValue - totalInvested
  });
});

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.error(`[startup] Space Ledger running on http://localhost:${PORT} | network=${SOLANA_NETWORK} | supabase=${db.connected ? 'connected' : 'memory-only'}`);
});

// Broadcast SSE heartbeat every 5 seconds
setInterval(function () {
  broadcastSSE({
    currentSupply: bondingCurve.getCurrentSupply(),
    currentPrice:  bondingCurve.calculatePrice(bondingCurve.getCurrentSupply())
  });
}, 5000);

// ── Grid helper ───────────────────────────────────────────────────────────────
function generateGrid(blockId) {
  const gridSize = 10;
  const grid     = [];
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
