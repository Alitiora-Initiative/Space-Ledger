# Space Ledger

Shared digital-canvas prototype on **Solana Devnet**: 10 billion blocks × 100 pixels = 1 trillion pixel positions.

Live site: [space-ledger-alitiora.vercel.app](https://space-ledger-alitiora.vercel.app)

**Operator:** Joseph Mushelle Nyingeh (Alitiora Initiative), Kenya. Contact: [jaymnyon@gmail.com](mailto:jaymnyon@gmail.com).

## What works on Devnet

- Linear primary-sale curve: each confirmed purchase advances supply and raises the next price ($0.001 → $1,000 over 10B blocks).
- Wallet Standard (Phantom, Solflare, …) → quote → wallet approve → receipt on Devnet.
- Grid, market of receipts, leaderboard, profile/dashboard with model PnL %.
- Rate limits; short TTL cache on config reads.

Program ID: `EbP7vsnMXPonTfriPUFynco69d69JiXpWbKnwVmz8sgG`

## What is not included

- Mainnet, secondary market, transfers, pixel-level on-chain ownership.
- Full WalletConnect QR (use Phantom/Solflare **in-app browser** — see `/pages/mobile.html`).

Devnet tokens have **no real-world value**.

## How to test

1. Wallet on **Devnet** + faucet SOL.
2. Connect once in the top nav.
3. Pricing → Use available balance / small budget → quote → approve.
4. Confirm on Explorer (Devnet cluster).

## Scale (Discord / Colosseum)

- Set Vercel `SOLANA_RPC_DEVNET` to **Helius Devnet** (not public `api.devnet.solana.com`, not mainnet beta).
- Quote ~20/min/IP; purchase build ~8/min/IP; reads ~60/min/IP (per instance).
- Receipt lists are capped; a full indexer is future work.

## Local development

```bash
cp .env.example .env
npm install && npm start
```

## Docs

- [Devnet Beta Guide](docs/Space-Ledger-Devnet-Beta-Guide.md)
- [Beta verification](docs/BETA_VERIFICATION.md)
- [Roadmap](ROADMAP.md)
