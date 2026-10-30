const test = require('node:test');
const assert = require('node:assert/strict');
const sl = require('../src/slToken');

const MINT = '42UNqmUTuKuKZ5mwo2r5y3cNoPv38P8fxAisqQLXdT6u';

test('host allowlist blocks loopback and accepts the Irys logo host', () => {
  assert.equal(sl.hostAllowed('gateway.irys.xyz'), true);
  assert.equal(sl.hostAllowed('cdn.datasprite-cdn.com'), true);
  assert.equal(sl.hostAllowed('localhost'), false);
  assert.equal(sl.hostAllowed('169.254.169.254'), false);
  assert.equal(sl.hostAllowed('evil.example'), false);
});

test('snapshot uses live source numbers and refuses to invent a price', () => {
  assert.throws(() => sl.shapeSnapshot({
    stonkfun: null,
    geckoPool: null,
    geckoTrades: null,
    geckoCandles: null,
    jupiter: null,
    raydium: null,
  }));

  const snapshot = sl.shapeSnapshot({
    fetchedAt: '2026-10-30T05:30:00.000Z',
    stonkfun: {
      data: {
        token: {
          mint: MINT,
          pool: sl.POOL,
          name: 'Space Ledger',
          symbol: 'SL',
          status: 'new',
          graduationProgress: 0.00004,
          createdAt: '2026-10-30T05:04:50.666Z',
          quote: { mint: '6GmAFSYs4gk3FDao5FzzySQpPZaWsa4rUJHacpMpUNgx', symbol: 'STONK', name: 'STONK' },
          market: {
            priceUsd: 0.00000276,
            marketCapUsd: 2760,
            fdvUsd: 2760,
            volume24hUsd: 68.5,
            liquidityUsd: 0.35,
            peakMarketCapUsd: 2771,
          },
        },
        launch: { creator: 'CreatorWallet1111111111111111111111111111111' },
      },
    },
    geckoPool: {
      data: {
        attributes: {
          base_token_price_usd: '0.00000278',
          fdv_usd: '2780',
          reserve_in_usd: '2779',
          volume_usd: { h24: '70' },
          price_change_percentage: { h24: '-0.2', h1: '0.1', m5: '0', m15: '0' },
          transactions: { h24: { buys: 4, sells: 2, buyers: 3, sellers: 2 } },
          pool_created_at: '2026-10-30T05:02:18Z',
        },
      },
    },
    geckoTrades: {
      data: [{
        attributes: {
          block_timestamp: '2026-10-30T05:06:35Z',
          tx_hash: 'sig111',
          tx_from_address: 'Wallet111111111111111111111111111111111111111',
          kind: 'buy',
          from_token_address: '6GmAFSYs4gk3FDao5FzzySQpPZaWsa4rUJHacpMpUNgx',
          to_token_address: MINT,
          from_token_amount: '1.5',
          to_token_amount: '90000',
          volume_in_usd: '0.25',
          price_to_in_usd: '0.00000277',
        },
      }],
    },
    geckoCandles: { data: { attributes: { ohlcv_list: [[1793336700, 1, 3, 1, 2, 4], [1793336400, 2, 2, 1, 1, 3]] } } },
    jupiter: { [MINT]: { usdPrice: 0.00000274, liquidity: 0.34, decimals: 6 } },
    raydium: { data: { rows: [{ supply: 1000000000, finishingRate: 0, poolId: sl.POOL, creator: 'CreatorWallet1111111111111111111111111111111' }] } },
  });

  assert.equal(snapshot.live, true);
  assert.equal(snapshot.simulated, false);
  assert.equal(snapshot.mint, MINT);
  assert.ok(Math.abs(snapshot.priceUsd - 0.00000276) < 0.00000001);
  assert.equal(snapshot.volume24hUsd, 70);
  assert.equal(snapshot.reportedLiquidityUsd, 0.34);
  assert.equal(snapshot.curveReserveUsd, 2779);
  assert.equal(snapshot.graduationProgress, 0.00004);
  assert.equal(snapshot.candles[0].c, 1);
  assert.equal(snapshot.candles[1].c, 2);
  assert.equal(snapshot.trades[0].side, 'buy');
  assert.equal(snapshot.trades[0].slAmount, 90000);
  assert.equal(snapshot.trades[0].explorerUrl, 'https://solscan.io/tx/sig111');
  assert.equal(snapshot.transactions24h.buys, 4);
});
