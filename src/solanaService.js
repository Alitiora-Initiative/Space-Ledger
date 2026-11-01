'use strict';

const { createHash } = require('node:crypto');

const DEVNET_RPC = process.env.SOLANA_RPC_DEVNET || 'https://api.devnet.solana.com';
const TREASURY = 'EDZjEbRAtqyC8z6ta6PYHX161Xynt13tWpd7orKERkbz';
const USDC_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
const PYTH_PROGRAM = 'rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ';
const SOL_USD_FEED = '7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE';
const SOL_USD_FEED_ID = Buffer.from('ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d', 'hex');
const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const ASSOCIATED_TOKEN_PROGRAM = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
const SYSTEM_PROGRAM = '11111111111111111111111111111111';
let devnetConnection;
const TOTAL_BLOCKS = 10_000_000_000n;
const START_PRICE_MICRO_USD = 1_000n;
const TARGET_PRICE_MICRO_USD = 1_000_000_000n;
const PURCHASE_FEE_MICRO_USD = 100_000n;
const MAX_PRICE_AGE_SECONDS = 90n;
const MAX_BLOCKS_PER_PURCHASE = 100_000_000;
const MIN_USD_VALUE_MICRO = 100n; // Minimum purchase: $0.0001 USD (100 micro USD)
const RECEIPT_ACCOUNT_DISCRIMINATOR = createHash('sha256').update('account:PurchaseReceipt').digest().subarray(0, 8);

function web3() {
  return require('@solana/web3.js');
}

function configuredProgramId() {
  const value = process.env.SOLANA_PROGRAM_ID;
  if (!value) throw new Error('The Devnet ownership program has not been configured.');
  return new (web3().PublicKey)(value);
}

function connection() {
  if (!devnetConnection) devnetConnection = new (web3().Connection)(DEVNET_RPC, 'confirmed');
  return devnetConnection;
}

function discriminator(name) {
  return createHash('sha256').update(`global:${name}`).digest().subarray(0, 8);
}

function writeU64(value) {
  const output = Buffer.alloc(8);
  output.writeBigUInt64LE(BigInt(value));
  return output;
}

function writeU32(value) {
  const output = Buffer.alloc(4);
  output.writeUInt32LE(Number(value));
  return output;
}

function derivePda(programId, ...seeds) {
  return web3().PublicKey.findProgramAddressSync(seeds.map(seed => Buffer.isBuffer(seed) ? seed : Buffer.from(seed)), programId)[0];
}

function configPda(programId) {
  return derivePda(programId, 'config');
}

function receiptPda(programId, startBlock) {
  return derivePda(programId, 'receipt', writeU64(startBlock));
}

function decodePurchaseReceipt(pubkey, account, programId) {
  const data = Buffer.from(account.data || []);
  if (!account.owner?.equals(programId) || data.length !== 85 || !data.subarray(0, 8).equals(RECEIPT_ACCOUNT_DISCRIMINATOR)) {
    throw new Error('An on-chain purchase receipt failed validation.');
  }

  const startBlock = data.readBigUInt64LE(8);
  const blockCount = data.readUInt32LE(16);
  const endBlock = startBlock + BigInt(blockCount) - 1n;
  const assetByte = data[52];
  const settledAt = data.readBigInt64LE(77);
  if (blockCount < 1 || blockCount > MAX_BLOCKS_PER_PURCHASE || startBlock >= TOTAL_BLOCKS || endBlock >= TOTAL_BLOCKS || assetByte > 1 || settledAt < 0n || !pubkey.equals(receiptPda(programId, startBlock))) {
    throw new Error('An on-chain purchase receipt failed validation.');
  }

  const buyer = new (web3().PublicKey)(data.subarray(20, 52)).toBase58();
  return {
    receipt: pubkey.toBase58(),
    buyer,
    startBlock: startBlock.toString(),
    startLabel: require('./blockId').format(Number(startBlock)),
    blockCount,
    endBlock: endBlock.toString(),
    endLabel: require('./blockId').format(Number(endBlock)),
    asset: assetByte === 0 ? 'SOL' : 'USDC',
    paidUnits: data.readBigUInt64LE(53).toString(),
    priceMicroUsd: data.readBigUInt64LE(61).toString(),
    feeMicroUsd: data.readBigUInt64LE(69).toString(),
    settledAt: Number(settledAt),
  };
}

function totalPriceMicroUsd(start, count) {
  const n = BigInt(count);
  const startBlock = BigInt(start);
  if (n < 1n || n > BigInt(MAX_BLOCKS_PER_PURCHASE) || startBlock + n > TOTAL_BLOCKS) {
    throw new Error(`Choose between 1 and ${MAX_BLOCKS_PER_PURCHASE.toLocaleString()} unsold blocks.`);
  }
  const positions = n * startBlock + n * (n - 1n) / 2n;
  const slope = TARGET_PRICE_MICRO_USD - START_PRICE_MICRO_USD;
  return START_PRICE_MICRO_USD * n + slope * positions / TOTAL_BLOCKS;
}

function usdMicroToLamports(usdMicro, price, exponent) {
  const exp = Number(exponent);
  if (price <= 0n || exp < -12 || exp > 6) throw new Error('The current Devnet SOL/USD price is invalid.');
  let numerator = BigInt(usdMicro) * 1_000n;
  let denominator = BigInt(price);
  if (exp < 0) numerator *= 10n ** BigInt(-exp);
  else denominator *= 10n ** BigInt(exp);
  return (numerator + denominator - 1n) / denominator;
}

function parsePythSolUsd(data, nowSeconds = BigInt(Math.floor(Date.now() / 1000))) {
  const bytes = Buffer.from(data);
  const accountDiscriminator = createHash('sha256').update('account:PriceUpdateV2').digest().subarray(0, 8);
  if (bytes.length < 101 || !bytes.subarray(0, 8).equals(accountDiscriminator) || bytes[40] !== 1 || !bytes.subarray(41, 73).equals(SOL_USD_FEED_ID)) {
    throw new Error('The on-chain Pyth account is not a fully verified SOL/USD feed.');
  }
  const price = bytes.readBigInt64LE(73);
  const confidence = bytes.readBigUInt64LE(81);
  const exponent = bytes.readInt32LE(89);
  const publishTime = bytes.readBigInt64LE(93);
  if (price <= 0n || confidence * 10n > BigInt(price) || publishTime > nowSeconds + 30n || nowSeconds - publishTime > MAX_PRICE_AGE_SECONDS) {
    throw new Error('The on-chain SOL/USD price is stale or outside the Devnet confidence limit. Try again shortly.');
  }
  return { price, confidence, exponent, publishTime };
}

async function getState(programId = configuredProgramId()) {
  const conn = connection();
  const address = configPda(programId);
  const info = await conn.getAccountInfo(address, 'confirmed');
  if (!info) return { currentSupply: 0n, initialized: false, address, connection: conn, programId };
  if (!info.owner.equals(programId) || info.data.length < 48) throw new Error('The on-chain ledger state is invalid.');
  return {
    currentSupply: info.data.readBigUInt64LE(40),
    initialized: true,
    address,
    connection: conn,
    programId,
  };
}

async function getOracle(connectionValue) {
  const feed = new (web3().PublicKey)(SOL_USD_FEED);
  const info = await connectionValue.getAccountInfo(feed, 'confirmed');
  if (!info || info.owner.toBase58() !== PYTH_PROGRAM) throw new Error('The Devnet SOL/USD oracle is unavailable.');
  return parsePythSolUsd(info.data);
}

async function quote({ asset, amount }) {
  const state = await getState();
  const normalizedAsset = String(asset || '').toUpperCase();
  if (!['SOL', 'USDC'].includes(normalizedAsset)) throw new Error('Choose Devnet SOL or Devnet USDC.');
  const budget = Number(amount);
  if (!Number.isFinite(budget) || budget <= 0 || budget > 1_000_000) throw new Error('Enter a positive test-token amount.');
  const amountUnits = normalizedAsset === 'SOL'
    ? BigInt(Math.floor(budget * 1_000_000_000))
    : BigInt(Math.floor(budget * 1_000_000));
  if (amountUnits <= 0n) throw new Error('The amount is too small.');

  let oracle;
  if (normalizedAsset === 'SOL') oracle = await getOracle(state.connection);
  const remaining = TOTAL_BLOCKS - state.currentSupply;
  let low = 0n;
  let high = remaining < BigInt(MAX_BLOCKS_PER_PURCHASE) ? remaining : BigInt(MAX_BLOCKS_PER_PURCHASE);
  while (low < high) {
    const mid = (low + high + 1n) / 2n;
    const totalMicro = totalPriceMicroUsd(state.currentSupply, Number(mid)) + PURCHASE_FEE_MICRO_USD;
    const needed = normalizedAsset === 'USDC'
      ? totalMicro
      : usdMicroToLamports(totalMicro, oracle.price, oracle.exponent);
    if (needed <= amountUnits) low = mid;
    else high = mid - 1n;
  }
  if (low < 1n) throw new Error('That amount is below the minimum purchase plus the $0.10 test fee.');
  const priceMicro = totalPriceMicroUsd(state.currentSupply, Number(low));
  
  // Validate minimum USD value ($0.0001)
  if (priceMicro < MIN_USD_VALUE_MICRO) {
    throw new Error(`Minimum purchase is $0.0001 USD. This quote is only $${(Number(priceMicro) / 1_000_000).toFixed(6)} USD. Increase your budget to meet the minimum.`);
  }
  const paymentUnits = normalizedAsset === 'USDC'
    ? priceMicro + PURCHASE_FEE_MICRO_USD
    : usdMicroToLamports(priceMicro + PURCHASE_FEE_MICRO_USD, oracle.price, oracle.exponent);
  return {
    network: 'devnet',
    asset: normalizedAsset,
    startBlock: state.currentSupply.toString(),
    blockCount: Number(low),
    priceMicroUsd: priceMicro.toString(),
    feeMicroUsd: PURCHASE_FEE_MICRO_USD.toString(),
    paymentUnits: paymentUnits.toString(),
    budgetUnits: amountUnits.toString(),
    paymentAmount: normalizedAsset === 'SOL'
      ? `${(Number(paymentUnits) / 1_000_000_000).toFixed(9)} SOL`
      : `${(Number(paymentUnits) / 1_000_000).toFixed(6)} USDC`,
    solUsd: oracle ? Number(oracle.price) * (10 ** oracle.exponent) : 1,
    feeUsd: 0.1,
    firstLabel: require('./blockId').format(Number(state.currentSupply)),
    lastLabel: require('./blockId').format(Number(state.currentSupply + low - 1n)),
    maxBlocksPerPurchase: MAX_BLOCKS_PER_PURCHASE,
  };
}

function ata(owner, mint) {
  const { PublicKey } = web3();
  return derivePda(
    new PublicKey(ASSOCIATED_TOKEN_PROGRAM),
    new PublicKey(owner).toBuffer(),
    new PublicKey(TOKEN_PROGRAM).toBuffer(),
    new PublicKey(mint).toBuffer(),
  );
}

function idempotentAtaInstruction(payer, owner, mint, address) {
  const { PublicKey, TransactionInstruction } = web3();
  return new TransactionInstruction({
    programId: new PublicKey(ASSOCIATED_TOKEN_PROGRAM),
    keys: [
      { pubkey: new PublicKey(payer), isSigner: true, isWritable: true },
      { pubkey: new PublicKey(address), isSigner: false, isWritable: true },
      { pubkey: new PublicKey(owner), isSigner: false, isWritable: false },
      { pubkey: new PublicKey(mint), isSigner: false, isWritable: false },
      { pubkey: new PublicKey(SYSTEM_PROGRAM), isSigner: false, isWritable: false },
      { pubkey: new PublicKey(TOKEN_PROGRAM), isSigner: false, isWritable: false },
    ],
    data: Buffer.from([1]),
  });
}

async function buildPurchaseTransaction({ buyer: buyerValue, asset: assetValue, blockCount: countValue, budget: budgetValue }) {
  const { PublicKey, Transaction, TransactionInstruction, SystemProgram } = web3();
  const buyer = new PublicKey(buyerValue);
  const asset = String(assetValue || '').toUpperCase();
  const blockCount = Number(countValue);
  if (!['SOL', 'USDC'].includes(asset)) throw new Error('Choose Devnet SOL or Devnet USDC.');
  if (!Number.isInteger(blockCount) || blockCount < 1 || blockCount > MAX_BLOCKS_PER_PURCHASE) throw new Error('The block count is outside the allowed range.');

  const state = await getState();
  const priceMicro = totalPriceMicroUsd(state.currentSupply, blockCount);
  
  // Validate minimum USD value ($0.0001)
  if (priceMicro < MIN_USD_VALUE_MICRO) {
    throw new Error(`Minimum purchase is $0.0001 USD. This purchase is only $${(Number(priceMicro) / 1_000_000).toFixed(6)} USD. Increase the block count to meet the minimum.`);
  }
  
  const programId = state.programId;
  const treasury = new PublicKey(TREASURY);
  const receipt = receiptPda(programId, state.currentSupply);
  const tx = new Transaction();
  if (!state.initialized) {
    tx.add(new TransactionInstruction({
      programId,
      keys: [
        { pubkey: buyer, isSigner: true, isWritable: true },
        { pubkey: state.address, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: discriminator('initialize'),
    }));
  }

  if (asset === 'SOL') {
    const oracle = await getOracle(state.connection);
    const minPayment = usdMicroToLamports(priceMicro + PURCHASE_FEE_MICRO_USD, oracle.price, oracle.exponent);
    const budgetLamports = BigInt(budgetValue || minPayment.toString());
    if (budgetLamports < minPayment) throw new Error('Your maximum SOL payment is below the verified quote. Recalculate the quote.');
    const data = Buffer.concat([discriminator('purchase_sol'), writeU32(blockCount), writeU64(budgetLamports)]);
    tx.add(new TransactionInstruction({
      programId,
      keys: [
        { pubkey: buyer, isSigner: true, isWritable: true },
        { pubkey: state.address, isSigner: false, isWritable: true },
        { pubkey: treasury, isSigner: false, isWritable: true },
        { pubkey: new PublicKey(SOL_USD_FEED), isSigner: false, isWritable: false },
        { pubkey: receipt, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    }));
  } else {
    const usdcUnits = priceMicro + PURCHASE_FEE_MICRO_USD;
    const budgetUnits = BigInt(budgetValue || usdcUnits.toString());
    if (budgetUnits < usdcUnits) throw new Error('Your maximum USDC payment is below the verified quote. Recalculate the quote.');
    const mint = new PublicKey(USDC_MINT);
    const buyerAta = ata(buyer, mint);
    const treasuryAta = ata(treasury, mint);
    if (!await state.connection.getAccountInfo(treasuryAta, 'confirmed')) {
      tx.add(idempotentAtaInstruction(buyer, treasury, mint, treasuryAta));
    }
    const data = Buffer.concat([discriminator('purchase_usdc'), writeU32(blockCount), writeU64(budgetUnits)]);
    tx.add(new TransactionInstruction({
      programId,
      keys: [
        { pubkey: buyer, isSigner: true, isWritable: true },
        { pubkey: state.address, isSigner: false, isWritable: true },
        { pubkey: receipt, isSigner: false, isWritable: true },
        { pubkey: buyerAta, isSigner: false, isWritable: true },
        { pubkey: treasuryAta, isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: new PublicKey(TOKEN_PROGRAM), isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    }));
  }

  tx.feePayer = buyer;
  const { blockhash, lastValidBlockHeight } = await state.connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
  return {
    transaction: serialized.toString('base64'),
    blockhash,
    lastValidBlockHeight,
    startBlock: state.currentSupply.toString(),
    blockCount,
    asset,
    priceMicroUsd: priceMicro.toString(),
    feeMicroUsd: PURCHASE_FEE_MICRO_USD.toString(),
    treasury: TREASURY,
  };
}

async function listReceipts({ buyer, blockId, limit } = {}) {
  const { PublicKey } = web3();
  const state = await getState();
  if (!state.initialized) return [];
  const filters = [{ dataSize: 85 }];
  if (buyer) filters.push({ memcmp: { offset: 20, bytes: new PublicKey(buyer).toBase58() } });
  const accounts = await state.connection.getProgramAccounts(state.programId, { commitment: 'confirmed', filters });
  let rows = accounts.map(({ pubkey, account }) => decodePurchaseReceipt(pubkey, account, state.programId))
    .filter(receipt => blockId === undefined || (BigInt(blockId) >= BigInt(receipt.startBlock) && BigInt(blockId) <= BigInt(receipt.endBlock)));
  rows.sort((a, b) => b.settledAt - a.settledAt);
  const cap = limit != null ? Math.min(Number(limit) || 100, 500) : undefined;
  if (cap) rows = rows.slice(0, cap);
  return rows;
}

function detectRpcProvider(rpcUrl) {
  try {
    const parsed = new URL(rpcUrl);
    if (parsed.hostname.toLowerCase().endsWith('helius-rpc.com')) return 'helius-devnet';
  } catch {}
  return 'public-devnet';
}

async function publicConfig() {
  const programId = configuredProgramId();
  const state = await getState(programId);
  const { PublicKey } = web3();
  const treasury = new PublicKey(TREASURY);
  const solBalanceLamports = await state.connection.getBalance(treasury, 'confirmed');
  const treasuryUsdcAta = ata(treasury, new PublicKey(USDC_MINT));
  const usdcAccount = await state.connection.getAccountInfo(treasuryUsdcAta, 'confirmed');
  const usdcBalance = usdcAccount
    ? (await state.connection.getTokenAccountBalance(treasuryUsdcAta, 'confirmed')).value.uiAmountString
    : '0';
  return {
    network: 'devnet',
    rpc: 'https://api.devnet.solana.com',
    rpcProvider: detectRpcProvider(DEVNET_RPC),
    programId: programId.toBase58(),
    treasury: TREASURY,
    usdcMint: USDC_MINT,
    currentSupply: state.currentSupply.toString(),
    initialized: state.initialized,
    ownershipVerified: state.initialized,
    treasuryBalanceLamports: String(solBalanceLamports),
    treasuryBalanceSol: (solBalanceLamports / 1_000_000_000).toFixed(9),
    treasuryBalanceUsdc: usdcBalance,
  };
}

async function signaturesForAccount(address, limit = 5) {
  const { PublicKey } = web3();
  const state = await getState();
  const pubkey = typeof address === 'string' ? new PublicKey(address) : address;
  const rows = await state.connection.getSignaturesForAddress(pubkey, { limit });
  return rows.map(row => ({
    signature: row.signature,
    slot: row.slot,
    err: row.err || null,
    blockTime: row.blockTime || null,
    explorerUrl: `https://explorer.solana.com/tx/${row.signature}?cluster=devnet`,
  }));
}

module.exports = {
  MAX_BLOCKS_PER_PURCHASE,
  PURCHASE_FEE_MICRO_USD,
  SOL_USD_FEED,
  USDC_MINT,
  buildPurchaseTransaction,
  configPda,
  decodePurchaseReceipt,
  detectRpcProvider,
  getState,
  listReceipts,
  parsePythSolUsd,
  publicConfig,
  quote,
  signaturesForAccount,
  totalPriceMicroUsd,
  usdMicroToLamports,
};
