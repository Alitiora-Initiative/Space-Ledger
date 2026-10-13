if (process.env.NODE_ENV !== 'test') require('dotenv').config();
const express = require('express');
const path = require('path');
const bondingCurve = require('./bondingCurve');
const rpcRouter = require('./rpcRouter');
const blockIds = require('./blockId');
const solanaService = require('./solanaService');
const { createRateLimiter } = require('./rateLimit');

// Best-effort per-instance limits for Devnet beta (see issue #5).
const quoteRateLimit = createRateLimiter({ windowMs: 60_000, max: 30, name: 'quote' });
const purchaseRateLimit = createRateLimiter({ windowMs: 60_000, max: 10, name: 'purchase' });

const PORT = Number.parseInt(process.env.PORT, 10) || 3000;
// This release is deliberately pinned to Devnet. Mainnet must be a separately
// reviewed migration, not an environment-variable flip.
const SOLANA_NETWORK = 'devnet';
const NOT_DEPLOYED = 'The Solana Devnet program is not configured.';

const app = express();
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.set({
    'Content-Security-Policy': "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' https://api.devnet.solana.com wss://api.devnet.solana.com",
    'Permissions-Policy': 'camera=(), geolocation=(), microphone=()',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY'
  });
  next();
});
app.use(express.json({ limit: '16kb' }));
app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/solana/config', async (_req, res) => {
  try {
    res.json(await solanaService.publicConfig());
  } catch (error) {
    res.status(503).json({ error: error.message || PROGRAM_NOT_CONFIGURED, network: 'devnet' });
  }
});

app.get('/api/solana/quote', quoteRateLimit, async (req, res) => {
  try {
    res.json(await solanaService.quote({ asset: req.query.asset, amount: req.query.amount }));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Bonding curve values are estimates from the published formula, not live sale quotes.
app.get('/api/price/range', (req, res) => {
  const start = blockIds.parse(req.query.start ?? '');
  const requestedCount = Number.parseInt(req.query.count, 10);
  const count = Number.isFinite(requestedCount) ? Math.min(Math.max(requestedCount, 1), 100) : 1;
  if (start === null || start >= bondingCurve.TOTAL_SUPPLY || start + count > bondingCurve.TOTAL_SUPPLY) {
    return res.status(400).json({ error: 'Choose a block ID and range within the published supply.' });
  }
  res.json(Array.from({ length: count }, (_, i) => ({
    blockId: start + i,
    blockLabel: blockIds.format(start + i),
    price: bondingCurve.calculatePrice(start + i),
    status: 'estimate'
  })));
});

app.get('/api/price/:blockId', (req, res) => {
  const blockId = blockIds.parse(req.params.blockId);
  if (blockId === null || blockId >= bondingCurve.TOTAL_SUPPLY) {
    return res.status(400).json({ error: 'Block ID must be a valid label or number within the published supply.' });
  }
  res.json({ blockId, blockLabel: blockIds.format(blockId), price: bondingCurve.calculatePrice(blockId), status: 'estimate', message: 'Model estimate only; use the Devnet quote endpoint before purchasing.' });
});

app.get('/api/supply', async (_req, res) => {
  if (!process.env.SOLANA_PROGRAM_ID) return res.json({ totalSupply: bondingCurve.TOTAL_SUPPLY, currentSupply: null, status: 'not_deployed', message: NOT_DEPLOYED });
  try {
    const state = await solanaService.getState();
    res.json({ totalSupply: bondingCurve.TOTAL_SUPPLY, currentSupply: state.currentSupply.toString(), status: state.initialized ? 'devnet_verified' : 'awaiting_initialization', message: state.initialized ? 'Supply is read from the Devnet ownership program.' : 'The Devnet program is deployed but its ledger state has not been initialized.' });
  } catch (error) {
    res.status(503).json({ error: error.message });
  }
});

app.get('/api/treasury', async (_req, res) => {
  if (!process.env.SOLANA_PROGRAM_ID) return res.json({ status: 'not_deployed', contractAddress: null, verified: false, message: NOT_DEPLOYED });
  try {
    const config = await solanaService.publicConfig();
    res.json({ status: config.initialized ? 'devnet_verified' : 'awaiting_initialization', contractAddress: config.programId, walletAddress: config.treasury, verified: config.initialized, network: 'devnet', treasuryBalanceLamports: config.treasuryBalanceLamports, treasuryBalanceSol: config.treasuryBalanceSol, treasuryBalanceUsdc: config.treasuryBalanceUsdc });
  } catch (error) {
    res.status(503).json({ error: error.message });
  }
});

app.post('/api/rpc', async (req, res) => {
  const { networkId, method, params } = req.body || {};
  try {
    res.json(await rpcRouter.routeRequest(networkId, method, params));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/networks', (_req, res) => res.json(rpcRouter.getNetworks()));

app.get('/api/grid', async (req, res) => {
  const blockId = blockIds.parse(req.query.block ?? '');
  if (blockId === null || blockId >= bondingCurve.TOTAL_SUPPLY) {
    return res.status(400).json({ error: 'Block ID must be a valid label or number within the published supply.' });
  }
  try {
    const receipts = process.env.SOLANA_PROGRAM_ID ? await solanaService.listReceipts({ blockId }) : [];
    const grid = Array.from({ length: 10 }, (_, row) => Array.from({ length: 10 }, (_, column) => {
      const pixelIndex = row * 10 + column;
      return {
        blockId,
        blockLabel: blockIds.format(blockId),
        pixelIndex,
        globalPixelId: blockId * 100 + pixelIndex,
        estimatedUsd: bondingCurve.calculatePrice(blockId) / 100,
        ownership: process.env.SOLANA_PROGRAM_ID ? (receipts[0] ? 'receipt_verified' : 'available') : 'unverified',
        owner: receipts[0]?.buyer || null,
        receipt: receipts[0]?.receipt || null,
      };
    }));
    res.json({ blockId, blockLabel: blockIds.format(blockId), ownershipStatus: process.env.SOLANA_PROGRAM_ID ? 'devnet_verified' : 'unverified', grid });
  } catch (error) {
    res.status(503).json({ error: error.message });
  }
});

app.get('/api/stats', async (_req, res) => {
  if (!process.env.SOLANA_PROGRAM_ID) return res.json({ status: 'not_configured', totalSupply: bondingCurve.TOTAL_SUPPLY, currentSupply: null, totalFeesUsd: null, message: NOT_DEPLOYED });
  try {
    const state = await solanaService.getState();
    const receipts = await solanaService.listReceipts();
    const totalFeesMicroUsd = receipts.reduce((sum, item) => sum + BigInt(item.feeMicroUsd), 0n);
    res.json({ status: state.initialized ? 'devnet_verified' : 'awaiting_initialization', network: 'devnet', totalSupply: bondingCurve.TOTAL_SUPPLY, currentSupply: state.currentSupply.toString(), blocksRemaining: (BigInt(bondingCurve.TOTAL_SUPPLY) - state.currentSupply).toString(), purchaseCount: receipts.length, totalFeesUsd: (Number(totalFeesMicroUsd) / 1_000_000).toFixed(6), message: 'Supply, purchase count, and modeled fees are derived from on-chain Devnet receipts.' });
  } catch (error) {
    res.status(503).json({ error: error.message });
  }
});

app.get('/api/market', async (_req, res) => {
  if (!process.env.SOLANA_PROGRAM_ID) {
    return res.json({ status: 'not_configured', verified: false, network: 'devnet', marketType: 'primary_curve_model', message: NOT_DEPLOYED, latestReceipts: [] });
  }
  try {
    const state = await solanaService.getState();
    const receipts = await solanaService.listReceipts();
    const supply = Number(state.currentSupply);
    res.json({
      status: state.initialized ? 'devnet_verified' : 'awaiting_initialization',
      verified: state.initialized,
      network: 'devnet',
      marketType: 'primary_curve_model',
      currentSupply: state.currentSupply.toString(),
      nextBlockModelPriceUsd: supply < bondingCurve.TOTAL_SUPPLY ? bondingCurve.calculatePrice(supply) : null,
      confirmedPurchaseCount: receipts.length,
      latestReceipts: receipts.sort((a, b) => b.settledAt - a.settledAt).slice(0, 30).map(({ buyer: _buyer, ...receipt }) => receipt),
      message: 'The price is the published primary-sale model, not a traded market price. Receipts are confirmed Devnet purchases; resales and candlestick trading data are not available.',
    });
  } catch (error) {
    res.status(503).json({ error: error.message });
  }
});

app.get('/api/leaderboard', async (_req, res) => {
  if (!process.env.SOLANA_PROGRAM_ID) return res.status(503).json({ verified: false, network: 'devnet', holders: [], error: NOT_DEPLOYED });
  try {
    const receipts = await solanaService.listReceipts();
    const holders = new Map();
    for (const receipt of receipts) {
      const holder = holders.get(receipt.buyer) || { address: receipt.buyer, blocksOwned: 0, purchaseCount: 0, lastPurchaseAt: 0 };
      holder.blocksOwned += receipt.blockCount;
      holder.purchaseCount += 1;
      holder.lastPurchaseAt = Math.max(holder.lastPurchaseAt, receipt.settledAt);
      holders.set(receipt.buyer, holder);
    }
    const ranked = [...holders.values()].sort((a, b) => b.blocksOwned - a.blocksOwned || b.purchaseCount - a.purchaseCount || a.address.localeCompare(b.address)).slice(0, 100);
    res.json({ verified: true, network: 'devnet', ranking: 'confirmed purchase receipts', holderCount: holders.size, holders: ranked });
  } catch (error) {
    res.status(503).json({ verified: false, network: 'devnet', holders: [], error: error.message });
  }
});

app.get('/api/block-owner/:blockId', async (req, res) => {
  if (!process.env.SOLANA_PROGRAM_ID) return res.status(503).json({ error: 'Ownership cannot be verified: no ownership contract or indexer is deployed.' });
  const blockId = blockIds.parse(req.params.blockId);
  if (blockId === null) return res.status(400).json({ error: 'Block ID must be a valid label or number.' });
  try {
    const receipts = await solanaService.listReceipts({ blockId });
    const receipt = receipts[0];
    res.json(receipt
      ? { blockId, blockLabel: blockIds.format(blockId), owner: receipt.buyer, verified: true, receipt: receipt.receipt, asset: receipt.asset }
      : { blockId, blockLabel: blockIds.format(blockId), owner: null, verified: true, status: 'unowned' });
  } catch (error) {
    res.status(503).json({ error: error.message });
  }
});

app.get('/api/blocks/:address', async (req, res) => {
  if (!process.env.SOLANA_PROGRAM_ID) return res.status(503).json({ error: 'Wallet holdings cannot be verified: no ownership contract or indexer is deployed.' });
  try {
    const receipts = await solanaService.listReceipts({ buyer: req.params.address });
    res.json({ address: req.params.address, verified: true, ranges: receipts });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/portfolio/:address', async (req, res) => {
  if (!process.env.SOLANA_PROGRAM_ID) return res.status(503).json({ error: 'Portfolio data is unavailable until verified ownership indexing is deployed.' });
  try {
    const receipts = await solanaService.listReceipts({ buyer: req.params.address });
    const blocksOwned = receipts.reduce((sum, receipt) => sum + receipt.blockCount, 0);
    res.json({ address: req.params.address, verified: true, blocksOwned, purchaseCount: receipts.length, ranges: receipts });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/purchase', purchaseRateLimit, async (req, res) => {
  if (!process.env.SOLANA_PROGRAM_ID) return res.status(503).json({ error: 'Purchases are disabled until the Devnet ownership program is deployed and configured.' });
  try {
    const result = await solanaService.buildPurchaseTransaction({
      buyer: req.body?.buyer,
      asset: req.body?.asset,
      blockCount: req.body?.blockCount,
      budget: req.body?.budget,
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`[startup] Space Ledger on port ${PORT}; network=${SOLANA_NETWORK}; program=${process.env.SOLANA_PROGRAM_ID || 'disabled'}`);
});
