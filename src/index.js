if (process.env.NODE_ENV !== 'test') require('dotenv').config();
const express = require('express');
const path = require('path');
const bondingCurve = require('./bondingCurve');
const rpcRouter = require('./rpcRouter');

const PORT = Number.parseInt(process.env.PORT, 10) || 3000;
const SOLANA_NETWORK = process.env.SOLANA_NETWORK || 'devnet';
const SOLANA_RPC = SOLANA_NETWORK === 'mainnet-beta'
  ? (process.env.SOLANA_RPC_MAINNET || 'https://api.mainnet-beta.solana.com')
  : (process.env.SOLANA_RPC_DEVNET || 'https://api.devnet.solana.com');
const FEE_WALLET_ADDRESS = process.env.FEE_WALLET_ADDRESS || '';
const NOT_DEPLOYED = 'Ownership and settlement are unavailable until a verified on-chain program and durable indexer are configured.';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/config', (_req, res) => {
  res.json({
    status: 'read_only',
    solanaNetwork: SOLANA_NETWORK,
    solanaRpc: SOLANA_RPC,
    feeWallet: FEE_WALLET_ADDRESS,
    usdcMint: SOLANA_NETWORK === 'mainnet-beta'
      ? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
      : '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    totalBlocks: bondingCurve.TOTAL_SUPPLY,
    contractAddress: null,
    ownershipVerified: false,
    message: NOT_DEPLOYED
  });
});

// Bonding curve values are estimates from the published formula, not live sale quotes.
app.get('/api/price/range', (req, res) => {
  const start = Number.parseInt(req.query.start, 10);
  const requestedCount = Number.parseInt(req.query.count, 10);
  const count = Number.isFinite(requestedCount) ? Math.min(Math.max(requestedCount, 1), 100) : 1;
  if (!Number.isInteger(start) || start < 0 || start >= bondingCurve.TOTAL_SUPPLY || start + count > bondingCurve.TOTAL_SUPPLY) {
    return res.status(400).json({ error: 'Choose a block range within the published supply.' });
  }
  res.json(Array.from({ length: count }, (_, i) => ({
    blockId: start + i,
    price: bondingCurve.calculatePrice(start + i),
    status: 'estimate'
  })));
});

app.get('/api/price/:blockId', (req, res) => {
  const blockId = Number.parseInt(req.params.blockId, 10);
  if (!Number.isInteger(blockId) || blockId < 0 || blockId >= bondingCurve.TOTAL_SUPPLY) {
    return res.status(400).json({ error: 'Block ID must be within the published supply.' });
  }
  res.json({ blockId, price: bondingCurve.calculatePrice(blockId), status: 'estimate', message: NOT_DEPLOYED });
});

app.get('/api/supply', (_req, res) => {
  res.json({ totalSupply: bondingCurve.TOTAL_SUPPLY, currentSupply: null, status: 'not_deployed', message: NOT_DEPLOYED });
});

app.get('/api/treasury', (_req, res) => {
  res.json({ status: 'not_deployed', contractAddress: null, verified: false, message: NOT_DEPLOYED });
});

app.get('/api/vesting-status', (_req, res) => {
  res.json({ status: 'not_deployed', canRelease: false, verified: false, message: NOT_DEPLOYED });
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

app.get('/api/grid', (req, res) => {
  const blockId = Number.parseInt(req.query.block, 10);
  if (!Number.isInteger(blockId) || blockId < 0 || blockId >= bondingCurve.TOTAL_SUPPLY) {
    return res.status(400).json({ error: 'Block ID must be within the published supply.' });
  }
  const grid = Array.from({ length: 10 }, (_, row) => Array.from({ length: 10 }, (_, column) => {
    const pixelIndex = row * 10 + column;
    return {
      blockId,
      pixelIndex,
      globalPixelId: blockId * 100 + pixelIndex,
      estimatedUsd: bondingCurve.calculatePrice(blockId) / 100,
      ownership: 'unverified'
    };
  }));
  res.json({ blockId, ownershipStatus: 'unverified', grid });
});

app.get('/api/genesis', (_req, res) => {
  res.json({ status: 'planned', verified: false, ownerAddress: null, startBlock: 0, endBlock: 999999999, totalBlocks: 1000000000, message: NOT_DEPLOYED });
});

app.get('/api/stats', (_req, res) => {
  res.json({ status: 'not_deployed', totalSupply: bondingCurve.TOTAL_SUPPLY, currentSupply: null, totalRevenue: null, totalFees: null, message: NOT_DEPLOYED });
});

app.get('/api/block-owner/:blockId', (_req, res) => {
  res.status(503).json({ error: 'Ownership cannot be verified: no ownership contract or indexer is deployed.' });
});

app.get('/api/blocks/:address', (_req, res) => {
  res.status(503).json({ error: 'Wallet holdings cannot be verified: no ownership contract or indexer is deployed.' });
});

app.get('/api/portfolio/:address', (_req, res) => {
  res.status(503).json({ error: 'Portfolio data is unavailable until verified ownership indexing is deployed.' });
});

app.post('/api/purchase', (_req, res) => {
  res.status(503).json({ error: 'Purchases are disabled until on-chain ownership verification and durable indexing are deployed.' });
});

app.post('/api/swap', (_req, res) => {
  res.status(503).json({ error: 'Resales are disabled until on-chain ownership and settlement are deployed.' });
});

app.get('/api/stream', (_req, res) => {
  res.status(503).json({ error: 'Live ledger events are unavailable until the on-chain program and indexer are deployed.' });
});

app.listen(PORT, () => {
  console.log(`[startup] Space Ledger read-only preview on port ${PORT}; network=${SOLANA_NETWORK}`);
});
