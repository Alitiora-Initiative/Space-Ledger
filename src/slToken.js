const MINT = '42UNqmUTuKuKZ5mwo2r5y3cNoPv38P8fxAisqQLXdT6u';
const POOL = 'EPAsaZjCvMZitE8d65KAR7yxpFbt8gAZo8zNzQk4YQsy';
const QUOTE_MINT = '6GmAFSYs4gk3FDao5FzzySQpPZaWsa4rUJHacpMpUNgx';
const SUPPLY_FALLBACK = 1_000_000_000;
const SITE = 'https://space-ledger-alitiora.vercel.app/pages/token.html';
const STONKFUN = `https://www.stonkfun.xyz/token/${MINT}`;

const SNAPSHOT_TTL_MS = 12_000;
const IMAGE_TTL_MS = 60 * 60 * 1000;
const MAX_IMAGE_BYTES = 1_500_000;

let snapshotCache = { at: 0, value: null };
let imageCache = { at: 0, value: null };

function num(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function median(values) {
  const sorted = values.filter(value => Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function hostAllowed(hostname) {
  const host = String(hostname || '').toLowerCase().replace(/\.$/, '');
  if (!host || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return false;
  if (host.includes(':') || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false;
  if (['gateway.irys.xyz', 'arweave.net', 'assets.geckoterminal.com', 'www.stonkfun.xyz', 'stonkfun.xyz'].includes(host)) return true;
  return host.endsWith('.irys.xyz') || host.endsWith('.datasprite-cdn.com') || host.endsWith('.arweave.net');
}

async function fetchJson(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(8000),
    headers: {
      accept: 'application/json',
      'user-agent': 'SpaceLedger/1.0 (+https://space-ledger-alitiora.vercel.app)',
    },
  });
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function loadSource(name, url) {
  try {
    return { name, ok: true, value: await fetchJson(url) };
  } catch (error) {
    const message = error.name === 'TimeoutError' || error.name === 'AbortError' ? 'timeout' : (error.message || 'failed');
    return { name, ok: false, error: message };
  }
}

function progressFraction(value) {
  const parsed = num(value);
  if (parsed === null || parsed < 0) return null;
  if (parsed <= 1) return parsed;
  if (parsed <= 100) return parsed / 100;
  return null;
}

function shapeSnapshot({ stonkfun, geckoPool, geckoTrades, geckoCandles, jupiter, raydium, fetchedAt }) {
  const token = stonkfun?.data?.token || null;
  const launch = stonkfun?.data?.launch || null;
  const pool = geckoPool?.data?.attributes || null;
  const quote = jupiter?.[MINT] || null;
  const curve = raydium?.data?.rows?.[0] || null;
  const liveSupply = num(curve?.supply) || SUPPLY_FALLBACK;
  const prices = {
    stonkfun: num(token?.market?.priceUsd),
    gecko: num(pool?.base_token_price_usd),
    jupiter: num(quote?.usdPrice),
  };
  const priceUsd = median(Object.values(prices));
  if (priceUsd === null) {
    const error = new Error('No live price from StonkFun, GeckoTerminal, or Jupiter.');
    error.sources = {
      stonkfun: stonkfun ? 'ok' : 'down',
      gecko: pool ? 'ok' : 'down',
      jupiter: quote ? 'ok' : 'down',
      raydium: curve ? 'ok' : 'down',
    };
    throw error;
  }

  const marketCaps = [num(token?.market?.marketCapUsd), num(token?.market?.fdvUsd), num(pool?.fdv_usd), priceUsd * liveSupply].filter(value => value !== null && value > 0);
  const marketCapUsd = median(marketCaps);
  const volumeCandidates = [num(pool?.volume_usd?.h24), num(token?.market?.volume24hUsd), num(curve?.volumeU)].filter(value => value !== null);
  const volume24hUsd = volumeCandidates.length ? volumeCandidates[0] : null;
  const reportedLiquidityUsd = num(quote?.liquidity) ?? num(token?.market?.liquidityUsd);
  const curveReserveUsd = num(pool?.reserve_in_usd);

  const candleRows = geckoCandles?.data?.attributes?.ohlcv_list;
  const candles = Array.isArray(candleRows)
    ? candleRows.map(row => ({
      t: num(row?.[0]),
      o: num(row?.[1]),
      h: num(row?.[2]),
      l: num(row?.[3]),
      c: num(row?.[4]),
      v: num(row?.[5]),
    })).filter(row => row.t !== null && row.c !== null).sort((a, b) => a.t - b.t)
    : [];

  const trades = Array.isArray(geckoTrades?.data)
    ? geckoTrades.data.slice(0, 20).map(row => {
      const trade = row.attributes || {};
      const signature = typeof trade.tx_hash === 'string' ? trade.tx_hash : null;
      return {
        time: trade.block_timestamp || null,
        side: trade.kind === 'buy' || trade.kind === 'sell' ? trade.kind : null,
        volumeUsd: num(trade.volume_in_usd),
        priceUsd: num(trade.price_to_in_usd) || num(trade.price_from_in_usd),
        slAmount: trade.to_token_address === MINT ? num(trade.to_token_amount) : num(trade.from_token_amount),
        stonkAmount: trade.from_token_address === QUOTE_MINT ? num(trade.from_token_amount) : num(trade.to_token_amount),
        wallet: typeof trade.tx_from_address === 'string' ? trade.tx_from_address : null,
        signature,
        explorerUrl: signature ? `https://solscan.io/tx/${signature}` : null,
      };
    }).filter(trade => trade.side && trade.time)
    : [];

  const tx24 = pool?.transactions?.h24 || null;
  const graduation = progressFraction(token?.graduationProgress);
  const raydiumProgress = progressFraction(curve?.finishingRate);

  return {
    live: true,
    simulated: false,
    mint: MINT,
    pool: token?.pool || curve?.poolId || POOL,
    name: token?.name || curve?.name || 'Space Ledger',
    symbol: token?.symbol || curve?.symbol || 'SL',
    decimals: num(quote?.decimals) || num(curve?.decimals) || 6,
    supply: liveSupply,
    network: 'mainnet-beta',
    pair: {
      symbol: token?.quote?.symbol || 'STONK',
      name: token?.quote?.name || 'STONK',
      mint: token?.quote?.mint || QUOTE_MINT,
    },
    priceUsd,
    prices,
    marketCapUsd,
    peakMarketCapUsd: num(token?.market?.peakMarketCapUsd),
    volume24hUsd,
    reportedLiquidityUsd,
    curveReserveUsd,
    priceChangePercent: {
      m5: num(pool?.price_change_percentage?.m5),
      m15: num(pool?.price_change_percentage?.m15),
      h1: num(pool?.price_change_percentage?.h1),
      h24: num(pool?.price_change_percentage?.h24),
    },
    transactions24h: tx24 ? {
      buys: num(tx24.buys) || 0,
      sells: num(tx24.sells) || 0,
      buyers: num(tx24.buyers) || 0,
      sellers: num(tx24.sellers) || 0,
    } : null,
    graduationProgress: graduation,
    raydiumFinishingRate: raydiumProgress,
    status: token?.status || null,
    createdAt: token?.createdAt || launch?.createdAt || pool?.pool_created_at || null,
    creator: launch?.creator || curve?.creator || null,
    description: curve?.description || 'Space Ledger ($SL) on StonkFun, paired with STONK.',
    imageUrl: '/api/token/sl/image',
    candles,
    trades,
    links: {
      stonkfun: STONKFUN,
      page: SITE,
      github: 'https://github.com/Alitiora-Initiative/Space-Ledger',
      solscan: `https://solscan.io/token/${MINT}`,
      gecko: `https://www.geckoterminal.com/solana/pools/${POOL}`,
      jupiter: `https://jup.ag/tokens/${MINT}`,
    },
    sources: {
      stonkfun: token ? 'ok' : 'down',
      gecko: pool ? 'ok' : 'down',
      jupiter: quote ? 'ok' : 'down',
      raydium: curve ? 'ok' : 'down',
    },
    note: 'Prices, volume, candles, and trades are read live from public market APIs. This server does not invent fills. Reported liquidity on a new bonding curve can be far smaller than market cap.',
    fetchedAt: fetchedAt || new Date().toISOString(),
  };
}

async function buildSnapshot() {
  const [stonk, geckoPool, geckoTrades, geckoCandles, jupiter, raydium] = await Promise.all([
    loadSource('stonkfun', `https://www.stonkfun.xyz/api/public/v1/tokens/${MINT}`),
    loadSource('gecko-pool', `https://api.geckoterminal.com/api/v2/networks/solana/pools/${POOL}`),
    loadSource('gecko-trades', `https://api.geckoterminal.com/api/v2/networks/solana/pools/${POOL}/trades`),
    loadSource('gecko-candles', `https://api.geckoterminal.com/api/v2/networks/solana/pools/${POOL}/ohlcv/minute?aggregate=1&limit=180&currency=usd`),
    loadSource('jupiter', `https://lite-api.jup.ag/price/v3?ids=${MINT}`),
    loadSource('raydium', `https://launch-mint-v1.raydium.io/get/by/mints?ids=${MINT}`),
  ]);

  const snapshot = shapeSnapshot({
    stonkfun: stonk.ok ? stonk.value : null,
    geckoPool: geckoPool.ok ? geckoPool.value : null,
    geckoTrades: geckoTrades.ok ? geckoTrades.value : null,
    geckoCandles: geckoCandles.ok ? geckoCandles.value : null,
    jupiter: jupiter.ok ? jupiter.value : null,
    raydium: raydium.ok ? raydium.value : null,
    fetchedAt: new Date().toISOString(),
  });
  snapshot.sources = {
    stonkfun: stonk.ok ? 'ok' : stonk.error,
    gecko: geckoPool.ok ? 'ok' : geckoPool.error,
    jupiter: jupiter.ok ? 'ok' : jupiter.error,
    raydium: raydium.ok ? 'ok' : raydium.error,
    trades: geckoTrades.ok ? 'ok' : geckoTrades.error,
    candles: geckoCandles.ok ? 'ok' : geckoCandles.error,
  };
  return snapshot;
}

async function getSnapshot() {
  if (snapshotCache.value && Date.now() - snapshotCache.at < SNAPSHOT_TTL_MS) return snapshotCache.value;
  const value = await buildSnapshot();
  snapshotCache = { at: Date.now(), value };
  return value;
}

async function readImage(url, hopsLeft) {
  if (!hostAllowed(new URL(url).hostname)) throw new Error('Image host is not allowed.');
  const response = await fetch(url, {
    redirect: 'manual',
    signal: AbortSignal.timeout(8000),
    headers: { accept: 'image/*,*/*', 'user-agent': 'SpaceLedger/1.0' },
  });
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location');
    if (!location || hopsLeft <= 0) throw new Error('Image redirect was rejected.');
    return readImage(new URL(location, url).toString(), hopsLeft - 1);
  }
  if (!response.ok) throw new Error(`Image HTTP ${response.status}`);
  const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'].includes(contentType)) {
    throw new Error('Image content type was rejected.');
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error('Image size was rejected.');
  return { contentType, body: bytes };
}

async function getImage() {
  if (imageCache.value && Date.now() - imageCache.at < IMAGE_TTL_MS) return imageCache.value;
  let sourceUrl = 'https://gateway.irys.xyz/cJbQEGTfHfJnP6B4oWBGQkJ9Me5bjiM3xxeZBPwX2Wd';
  try {
    const meta = await fetchJson(`https://www.stonkfun.xyz/api/public/v1/tokens/${MINT}`);
    const candidate = meta?.data?.token?.imageUrl;
    if (typeof candidate === 'string' && candidate.startsWith('https://') && hostAllowed(new URL(candidate).hostname)) {
      sourceUrl = candidate;
    }
  } catch (_) { /* keep the known Irys logo */ }
  const value = await readImage(sourceUrl, 3);
  imageCache = { at: Date.now(), value };
  return value;
}

module.exports = {
  MINT,
  POOL,
  getSnapshot,
  getImage,
  shapeSnapshot,
  hostAllowed,
  median,
};
