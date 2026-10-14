# Space Ledger

Shared digital-canvas prototype on **Solana Devnet**: 10 billion blocks × 100 pixels = 1 trillion pixel positions.

Live site: [space-ledger-alitiora.vercel.app](https://space-ledger-alitiora.vercel.app)

## Overview

Space Ledger is a shared canvas inspired by the Million Dollar Homepage, scaled to 1 trillion pixels. Built on Solana's high-performance blockchain, it features transparent bonding-curve pricing, on-chain ownership verification, and immutable receipts for every purchase.

### Key Features

- **Transparent Pricing**: Linear bonding curve from $0.001 to $1,000 per block, mathematically predictable and fully on-chain
- **On-Chain Ownership**: Every purchase recorded as an immutable Solana transaction receipt, verifiable by anyone
- **Real-Time Supply**: Live Devnet data shows exact blocks sold, available inventory, and holder rankings
- **Portfolio Tracking**: View your holdings, purchase history, and estimated model PnL in your profile
- **Grid Exploration**: Interactive 10×10 pixel grid view for browsing and discovering available blocks
- **Accessibility**: Keyboard navigation, screen reader support, and responsive design for all devices

## What works on Devnet

- **Linear primary-sale bonding curve**: `P(x) = m·x + $0.001`, rising toward **$1,000** over 10 billion blocks. **Each confirmed purchase advances on-chain supply and raises the price** for the next buyer.
- Wallet Standard discovery (Phantom, Solflare, and other registered Solana wallets).
- Quote → unsigned transaction → user approves in wallet → receipt account on Devnet.
- Grid browse, market of confirmed receipts, leaderboard, profile/dashboard with **model PnL %** and transaction history links.
- Rate limits on quote/purchase APIs; security headers on responses.
- Accessibility improvements: ARIA labels, focus states, keyboard navigation, Devnet-only legal notices.

Program ID (Devnet): `EbP7vsnMXPonTfriPUFynco69d69JiXpWbKnwVmz8sgG`

## What is not included

- Mainnet, secondary market, transfers, or pixel-level on-chain ownership (blocks only).
- Guaranteed multi-wallet on mobile without an in-app browser / WalletConnect (tracked separately).
- Legal contact details until the operator adds them.

Devnet SOL and Devnet USDC have **no real-world value**.

## How to buy (tester flow)

1. Connect once via **Connect Wallet** in the top nav (wallet network = **Devnet**).
2. Open **Pricing** or **Grid** → request a quote (or use **Buy this block**).
3. **Review and buy in wallet** → approve.
4. Confirm on Solana Explorer (Devnet) and check **Profile**.

## Local development

```bash
cp .env.example .env
# Set SOLANA_PROGRAM_ID and optionally SOLANA_RPC_DEVNET (Helius Devnet URL)
npm install
npm start
```

Environment (server-side only):

| Variable | Purpose |
|----------|---------|
| `SOLANA_PROGRAM_ID` | Devnet program id |
| `SOLANA_RPC_DEVNET` | RPC endpoint (prefer private Helius Devnet for ~100 concurrent testers) |

Never commit real API keys. Prefer `https://devnet.helius-rpc.com/?api-key=…` — not `beta.helius-rpc.com` (mainnet).

## Docs

- [Devnet Beta Guide](docs/Space-Ledger-Devnet-Beta-Guide.md)
- [Beta verification notes](docs/BETA_VERIFICATION.md)
- [Roadmap](ROADMAP.md)

## Pricing model (authoritative)

- **Off-chain estimates**: `src/bondingCurve.js` — `calculatePrice(supply)`.
- **On-chain settlement**: `programs/space-ledger` — `total_price_micro_usd(start, count)` using the same linear slope; `current_supply` increases after each purchase.
- Quotes always read **live** `current_supply` from the program config account.

## License / contribution

Operator: Alitiora Initiative. Review `ROADMAP.md` and `docs/MAINNET-MIGRATION-GUIDE.md` before proposing mainnet or marketplace features.
