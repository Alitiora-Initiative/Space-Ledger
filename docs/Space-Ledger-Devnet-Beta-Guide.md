# Space Ledger Devnet Beta Guide

> **Updated 2026-10-14.** Live Devnet purchases confirmed. Linear curve advances supply (and price) on every buy. UI: multi-wallet modal, grid buy deep-link, session wallet reconnect, profile model PnL %, purchase success toast, presentation polish.

This page documents the repository as implemented. It is an engineering guide, not a promise of production availability, a security audit, legal advice, or an offer to sell an asset.

## Pricing (linear; each buy raises the next price)

| Item | Value |
|------|--------|
| Formula | `P(x) = m·x + 0.001` USD per block at supply index `x` |
| Start | $0.001 at supply 0 |
| End | $1,000 near full 10B supply |
| Behavior | Each confirmed purchase increases `current_supply` on-chain; the next quote is higher |
| Fee | $0.10 test fee per purchase (modeled in micro-USD) |
| Settlement | Whole **blocks** only (100 pixels per block); not per-pixel on-chain |

Authoritative code: `src/bondingCurve.js`, `programs/space-ledger/src/lib.rs` (`total_price_micro_usd`).

## Product State

Space Ledger is a shared digital-canvas prototype. Its address space is 10 billion sequential blocks with 100 pixel positions per block. The active purchase and ownership program is Solana Devnet-only. Devnet tokens have no real-world value.

Confirmed purchases create receipt accounts owned by program `EbP7vsnMXPonTfriPUFynco69d69JiXpWbKnwVmz8sgG`. Supply, primary purchases, portfolio ranges, and holder rankings are read from those accounts.

## How to buy

1. Connect once via top-nav **Connect Wallet** (Phantom/Solflare on **Devnet**).
2. Open Pricing or Grid → get a quote (or **Buy this block**).
3. **Review and buy in wallet** → approve.
4. Confirm on Explorer; check Profile for holdings, history, and model PnL %.

## Wallet and session

- Wallet Standard discovery; nav shows short address when connected.
- Session reconnect via `walletReconnect.js` for the same browser tab.
- Success toast after a confirmed purchase (includes Explorer link).

## System layout

| Area | Location |
|------|----------|
| Website | `public/` |
| API | `src/index.js` |
| Solana service | `src/solanaService.js` |
| Price model | `src/bondingCurve.js` |
| Program | `programs/space-ledger/` |

## Environment

| Variable | Purpose |
|----------|---------|
| `SOLANA_PROGRAM_ID` | Devnet program id |
| `SOLANA_RPC_DEVNET` | Prefer Helius Devnet (not mainnet beta URL) |

## Not in this beta

Secondary market, transfers, pixel-level ownership, mainnet, mobile WalletConnect-only path without in-app browser.

For verification checklists see [BETA_VERIFICATION.md](BETA_VERIFICATION.md). For open product work see [ROADMAP.md](../ROADMAP.md).
