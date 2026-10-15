**Operator:** Joseph Mushelle Nyingeh · jaymnyon@gmail.com (Kenya). Devnet prototype only.

# Space Ledger Devnet Beta Guide

> Updated for public Discord testing: legal contact published, rate limits tightened, config cache, mobile in-app browser path, how-to-test on homepage.

## Pricing

Linear curve `P(x) = m·x + 0.001` USD. Each buy advances `current_supply`. Settlement is **whole blocks** only.

## Scale notes

- Prefer private Helius Devnet RPC on Vercel.
- Public Solana Devnet RPC will 429 under heavy concurrent load.
- Market/leaderboard receipt lists are limited; not a production indexer.

## Mobile

Use Phantom or Solflare **in-app browser** → site URL → Devnet network. See `/pages/mobile.html`. WalletConnect QR is not in this beta.

## Not in beta

Secondary market, transfers, per-pixel on-chain ownership, mainnet.
