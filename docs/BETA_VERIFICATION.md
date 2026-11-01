# Devnet beta verification notes

Last automated check: 2026-10-14.

## Production URL

- Site: https://space-ledger-alitiora.vercel.app
- Repo branch: `main`

## Environment variables (names only)

| Name | Required | Notes |
|------|----------|--------|
| `SOLANA_PROGRAM_ID` | Yes | Devnet program `EbP7vsnMXPonTfriPUFynco69d69JiXpWbKnwVmz8sgG` |
| `SOLANA_RPC_DEVNET` | Strongly recommended | Helius **Devnet**: `https://devnet.helius-rpc.com/?api-key=…` — never `beta.helius-rpc.com` (mainnet) |
| `NODE_ENV` | Optional | `production` on Vercel |

Secrets must be set in the **Vercel project dashboard** then **Redeploy**. Do not commit `.env`.

## Live API checks

| Route | Expected |
|-------|----------|
| `GET /api/solana/config` | 200, `network: "devnet"`, `initialized: true`, `rpcProvider` (`public-devnet` or `helius-devnet`) |
| `GET /api/supply` | 200, supply fields |
| `GET /api/market` | 200, includes `nextBlockModelPriceUsd` |
| `GET /api/leaderboard` | 200 |
| `GET /api/block-owner/:id` | 200; may include signatures |

## Pricing check

- Quotes and purchases must use on-chain `currentSupply`.
- After any successful buy, `/api/solana/config` and `/api/market` should show higher supply and higher `nextBlockModelPriceUsd`.
- This is the intended linear bonding-curve behavior: **each buy raises the price**.

## Rate limits

- Quote: 30 / min / IP
- Purchase build: 10 / min / IP

## Signature discovery

- `GET /api/block-owner/:blockId` → signatures / explorerUrl
- `GET /api/receipt/:address/signatures`

## Operator follow-ups

- Confirm Helius Devnet env on Vercel after dashboard save + redeploy
- Real privacy/support email on legal pages when available
