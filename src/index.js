if (process.env.NODE_ENV !== 'test') require('dotenv').config();
const express = require('express');
const path = require('path');
const bondingCurve = require('./bondingCurve');
const rpcRouter = require('./rpcRouter');
const blockIds = require('./blockId');
const solanaService = require('./solanaService');
const agentApi = require('./agents/api');

const PORT = Number.parseInt(process.env.PORT, 10) || 3000;
// This release is deliberately pinned to Devnet. Mainnet must be a separately
// reviewed migration, not an environment-variable flip.
const SOLANA_NETWORK = 'devnet';
const SOLANA_RPC = process.env.SOLANA_RPC_DEVNET || 'https://solana-rpc.rpcfast.com/?api_key=q8Db0rk7W2n0OuDfCX1aCrma8SbbO9Mscbh2GZJpO42NdQTdQQoV5g6NOaPG0BDl';
const SOLANA_WSS = process.env.SOLANA_WSS_DEVNET || 'wss://solana-rpc.rpcfast.com/?api_key=q8Db0rk7W2n0OuDfCX1aCrma8SbbO9Mscbh2GZJpO42NdQTdQQoV5g6NOaPG0BDl';
const FEE_WALLET_ADDRESS = process.env.FEE_WALLET_ADDRESS || '';
const NOT_DEPLOYED = 'The Solana Devnet program is not configured.';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/config', async (_req, res) => {
  const config = {
    status: process.env.SOLANA_PROGRAM_ID ? 'devnet_program_configured' : 'read_only',
    solanaNetwork: SOLANA_NETWORK,
    solanaRpc: SOLANA_RPC,
    feeWallet: FEE_WALLET_ADDRESS,
    usdcMint: SOLANA_NETWORK === 'mainnet-beta'
      ? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
      : '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    totalBlocks: bondingCurve.TOTAL_SUPPLY,
    contractAddress: process.env.SOLANA_PROGRAM_ID || null,
    ownershipVerified: false,
    message: process.env.SOLANA_PROGRAM_ID ? 'Devnet program configured; connect a Solana wallet to inspect live state.' : NOT_DEPLOYED
  };
  if (process.env.SOLANA_PROGRAM_ID) {
    try {
      const live = await solanaService.publicConfig();
      config.status = live.initialized ? 'devnet_verified' : 'awaiting_initialization';
      config.ownershipVerified = live.ownershipVerified;
      config.currentSupply = live.currentSupply;
    } catch (error) {
      return res.status(503).json({ ...config, error: error.message });
    }
  }
  res.json(config);
});

app.get('/api/solana/config', async (_req, res) => {
  try {
    res.json(await solanaService.publicConfig());
  } catch (error) {
    res.status(503).json({ error: error.message || PROGRAM_NOT_CONFIGURED, network: 'devnet' });
  }
});

app.get('/api/solana/quote', async (req, res) => {
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

app.get('/api/genesis', (_req, res) => {
  res.json({ status: 'sequential_devnet_sales', verified: Boolean(process.env.SOLANA_PROGRAM_ID), startBlock: 0, startBlockLabel: blockIds.format(0), totalBlocks: bondingCurve.TOTAL_SUPPLY, message: 'Blocks are allocated sequentially to confirmed Devnet purchase receipts.' });
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

app.post('/api/purchase', async (req, res) => {
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

app.post('/api/swap', (_req, res) => {
  res.status(503).json({ error: 'Resales are disabled until on-chain ownership and settlement are deployed.' });
});

app.get('/api/stream', (_req, res) => {
  res.status(503).json({ error: 'Live ledger events are unavailable until the on-chain program and indexer are deployed.' });
});

// GILGA PRIME Agent System API Routes
app.use('/api/agents', agentApi);

app.listen(PORT, () => {
  console.log(`[startup] Space Ledger on port ${PORT}; network=${SOLANA_NETWORK}; program=${process.env.SOLANA_PROGRAM_ID || 'disabled'}`);
  console.log(`[startup] GILGA PRIME Agent System initialized`);
});
