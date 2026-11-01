# Space Ledger

Shared digital-canvas prototype on **Solana Devnet**: 10 billion blocks × 100 pixels = 1 trillion pixel positions.

| | |
|---|---|
| **Live site** | [space-ledger-alitiora.vercel.app](https://space-ledger-alitiora.vercel.app) |
| **$SL market** | [Live $SL page](https://space-ledger-alitiora.vercel.app/pages/token.html) · mint `42UNqmUTuKuKZ5mwo2r5y3cNoPv38P8fxAisqQLXdT6u` |
| **Network** | Solana **Devnet only** |
| **Program** | `EbP7vsnMXPonTfriPUFynco69d69JiXpWbKnwVmz8sgG` |
| **Operator** | Joseph Mushelle Nyingeh (Alitiora Initiative), Kenya |
| **Contact** | [jaymnyon@gmail.com](mailto:jaymnyon@gmail.com) |

Devnet SOL / Devnet USDC have **no real-world value**. This is not an investment product and not a secondary market.

## What works today

- **Primary sale** on a linear bonding curve: each confirmed buy advances `current_supply` and raises the next price ($0.001 → $1,000 over 10B blocks).
- **Wallet Standard** multi-wallet connect (Phantom, Solflare, and others exposed in the browser).
- Flow: connect → quote (balance-aware) → wallet approve → on-chain **receipt** → Explorer link.
- **Grid** (whole-block buy deep-link), market of receipts, leaderboard, profile / dashboard (model PnL %).
- **Rate limits** + short config cache for free-tier hosting.
- **Treasury page**: Devnet program balances + optional **builder support goal** (progress toward 10 SOL-eq from public chain balances).
- Legal drafts: Privacy / Terms / Cookies with operator contact.
- Mobile path: Phantom or Solflare **in-app browser** ([guide](https://space-ledger-alitiora.vercel.app/pages/mobile.html)).

## What is not included / Next Upgrades

| Topic | Status |
|--------|--------|
| Mainnet | Not yet (out of scope until funded & audited) |
| Pixel & Grid Efficiency | Complete (virtualized 2D canvas viewport + `/api/grid/chunk`) |
| Two-way Market (Buy & Sell) | In architectural design (two-way bonding curve AMM) |
| Real Movement Chart | In design (Lightweight-Charts with live on-chain history) |
| WalletConnect QR | Use in-app browser instead |
| Paid audit | Future / grant-funded |

## Roadmap & Architecture Upgrades

Per operator scope update (2026-11-01), the team is designing three key system enhancements:
1. **Grid & Pixel Efficiency**: Virtualized viewport rendering (LOD canvas) and chunked API endpoints to handle scale without client memory lag.
2. **Buy & Sell Two-Way Orders**: Extending the on-chain bonding curve to support two-way redemption (`sell_blocks`) so users can exit positions directly back to the curve.
3. **Real Movement Charting**: Time-series price and supply charts backed purely by on-chain transaction history (no simulated prices or fake ticks).

See [ROADMAP.md](ROADMAP.md) for detailed architecture comparisons, trade-offs, and acceptance tests.



## How to test (2 minutes)

1. Install Phantom or Solflare; switch network to **Devnet**.
2. Get free Devnet SOL from a faucet.
3. Open the [live site](https://space-ledger-alitiora.vercel.app) → **Connect Wallet** (top nav, once).
4. **Pricing** → small budget or “Use available balance” → **Get Devnet quote** → approve in wallet.
5. Confirm on [Solana Explorer](https://explorer.solana.com/?cluster=devnet) (cluster = Devnet).

If public RPC is busy, wait a minute and retry.


## $SL development coin

[Space Ledger ($SL)](https://space-ledger-alitiora.vercel.app/pages/token.html) is a **Solana mainnet** coin on [StonkFun](https://www.stonkfun.xyz/token/42UNqmUTuKuKZ5mwo2r5y3cNoPv38P8fxAisqQLXdT6u), paired with STONK. The operator launched it so trading activity can help fund continued work on this website and protocol (hosting, RPC, interface, and review). It is separate from Devnet block purchases.

| | |
|---|---|
| Mint | `42UNqmUTuKuKZ5mwo2r5y3cNoPv38P8fxAisqQLXdT6u` |
| Pool | `EPAsaZjCvMZitE8d65KAR7yxpFbt8gAZo8zNzQk4YQsy` |
| Page | [/pages/token.html](https://space-ledger-alitiora.vercel.app/pages/token.html) |

The page’s `/api/token/sl` route reads StonkFun, Jupiter, GeckoTerminal, and Raydium on each request (short server cache). It does not simulate price, volume, or trades. $SL is speculative, not equity, and not a claim on canvas blocks.

## Optional builder support

Separate from Devnet purchases. Progress bar on [Treasury](https://space-ledger-alitiora.vercel.app/pages/treasury.html) reads **live wallet balances** and converts Arbitrum ETH / Bitcoin to SOL-equivalent with public USD prices.

| Chain | Address |
|--------|---------|
| Solana | `ETuGxX6Znxr9q59THJtcYDJKt6RvCfN7wp79tRnbG1xG` |
| Arbitrum | `0x7CaC4214A4842c30D1E19adab492F62fAE449bed` |
| Bitcoin | `bc1q9sadwz9aymgj9sw3xhfjxtw9zser6tgqp8xm8t` |

Support is **optional**, not required to use the app, and not an investment.

## Scale (Discord / free tier)

- Default RPC is public Devnet. For heavier load, set Vercel env `SOLANA_RPC_DEVNET` to a free **Helius Devnet** URL (never mainnet; never expose API keys to the browser).
- Approximate limits per instance: quote ~20/min/IP, purchase build ~8/min/IP, reads ~60/min/IP.
- Receipt lists are capped; a full indexer is future work.

## Local development

```bash
cp .env.example .env
# Set SOLANA_PROGRAM_ID and optional SOLANA_RPC_DEVNET
npm install
npm test
npm start
```

```bash
npm audit   # should report 0 vulnerabilities with package overrides
```

## Security notes (free tooling)

- Client config always returns public Devnet RPC — private keys stay server-side.
- Dependency overrides pin fixed `uuid` / `stream-json` versions.
- Not a substitute for a professional Solana program audit.

## Docs

- [Devnet Beta Guide](docs/Space-Ledger-Devnet-Beta-Guide.md)
- [Beta verification](docs/BETA_VERIFICATION.md)
- [Roadmap](ROADMAP.md)

## License

MIT — see repository license file if present. Logo: operator-generated (AI-assisted) for this project.
Operator: Alitiora Initiative. Review `ROADMAP.md` and `docs/MAINNET-MIGRATION-GUIDE.md` before proposing mainnet or marketplace features.
