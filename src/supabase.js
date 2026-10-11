// src/supabase.js
// Supabase client — used by all server routes that need database persistence.
// Falls back to in-memory (no-op) mode if env vars are not set, so the server
// still starts without Supabase configured.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL         = process.env.SUPABASE_URL         || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

let supabase = null;
let connected = false;

if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false }
  });
  connected = true;
  console.log('Supabase connected ✓');
} else {
  console.warn(
    'Supabase env vars not set — running in memory-only mode.\n' +
    'Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env to enable persistence.'
  );
}

// ─── Wallet ──────────────────────────────────────────────────────────────────

async function upsertWallet(address, walletType = 'evm') {
  if (!connected) return;
  const addr = address.toLowerCase();
  await supabase.from('wallets').upsert(
    { address: addr, wallet_type: walletType, last_seen_at: new Date().toISOString() },
    { onConflict: 'address' }
  );
}

// ─── Purchase ─────────────────────────────────────────────────────────────────

/**
 * Records a block purchase in Supabase.
 * @param {string} walletAddress
 * @param {number} blockIdStart
 * @param {number} blockCount
 * @param {number} totalPrice
 * @param {Function} priceForBlock  - (blockId) => number, bonding curve fn
 * @param {string} network
 * @param {string|null} txSignature
 */
async function recordPurchase(walletAddress, blockIdStart, blockCount, totalPrice, priceForBlock, network, txSignature = null) {
  if (!connected) return;

  const addr = walletAddress.toLowerCase();
  const now  = new Date().toISOString();

  // 1. Upsert wallet
  await upsertWallet(addr, network.startsWith('solana') ? 'solana' : 'evm');

  // 2. Insert transaction record
  const { data: tx, error: txErr } = await supabase
    .from('transactions')
    .insert({
      wallet_address:  addr,
      block_id_start:  blockIdStart,
      block_count:     blockCount,
      total_price:     totalPrice,
      fee_collected:   0.10,
      network:         network,
      tx_signature:    txSignature,
      status:          txSignature ? 'confirmed' : 'pending',
      created_at:      now
    })
    .select()
    .single();

  if (txErr) {
    console.error('Supabase transaction insert error:', txErr.message);
    return;
  }

  // 3. Insert one row per block
  const blockRows = [];
  for (let i = 0; i < blockCount; i++) {
    const bid = blockIdStart + i;
    blockRows.push({
      block_id:       bid,
      owner_address:  addr,
      purchase_price: priceForBlock(bid),
      current_price:  priceForBlock(bid),
      network:        network,
      tx_signature:   txSignature,
      purchased_at:   now
    });
  }

  const { error: blockErr } = await supabase
    .from('blocks')
    .upsert(blockRows, { onConflict: 'block_id' });

  if (blockErr) {
    console.error('Supabase blocks insert error:', blockErr.message);
  }

  // 4. Record fee
  await supabase.from('fees').insert({
    amount:       0.10,
    currency:     'USDC',
    source_tx:    tx ? tx.id : null,
    collected_at: now
  });
}

// ─── Read ownership ──────────────────────────────────────────────────────────

async function getBlocksByAddress(address) {
  if (!connected) return null; // caller falls back to in-memory
  const { data, error } = await supabase
    .from('blocks')
    .select('block_id, purchase_price, current_price, network, tx_signature, purchased_at')
    .eq('owner_address', address.toLowerCase())
    .order('purchased_at', { ascending: true });

  if (error) {
    console.error('Supabase getBlocksByAddress error:', error.message);
    return null;
  }
  return data.map(r => ({
    blockId:       r.block_id,
    purchasePrice: parseFloat(r.purchase_price),
    currentPrice:  r.current_price ? parseFloat(r.current_price) : parseFloat(r.purchase_price),
    network:       r.network,
    txSignature:   r.tx_signature,
    timestamp:     new Date(r.purchased_at).getTime()
  }));
}

// ─── Update current prices (called periodically) ─────────────────────────────

async function updateCurrentPrices(priceForBlock) {
  if (!connected) return;
  const { data, error } = await supabase.from('blocks').select('block_id');
  if (error || !data) return;

  const updates = data.map(r => ({
    block_id:      r.block_id,
    current_price: priceForBlock(r.block_id)
  }));

  // Batch upsert in chunks of 500
  const CHUNK = 500;
  for (let i = 0; i < updates.length; i += CHUNK) {
    await supabase
      .from('blocks')
      .upsert(updates.slice(i, i + CHUNK), { onConflict: 'block_id' });
  }
}

// ─── Portfolio summary ────────────────────────────────────────────────────────

async function getPortfolioSummary(address) {
  if (!connected) return null;
  const { data, error } = await supabase
    .from('wallet_portfolio')
    .select('*')
    .eq('owner_address', address.toLowerCase())
    .single();

  if (error) return null;
  return data;
}

module.exports = {
  supabase,
  connected,
  upsertWallet,
  recordPurchase,
  getBlocksByAddress,
  updateCurrentPrices,
  getPortfolioSummary
};
