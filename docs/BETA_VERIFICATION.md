# Devnet beta verification notes

Last automated check: 2026-10-14 (UTC+3 context).

## Production URL

- Site: https://space-ledger-alitiora.vercel.app
- Repo branch: `main`

## Environment variables (names only)

| Name | Required | Notes |
|------|----------|--------|
| `SOLANA_PROGRAM_ID` | Yes | Devnet program `EbP7vsnMXPonTfriPUFynco69d69JiXpWbKnwVmz8sgG` |
| `SOLANA_RPC_DEVNET` | Strongly recommended | Use Helius **Devnet**: `https://devnet.helius-rpc.com/?api-key=…` — never `beta.helius-rpc.com` (mainnet) |
| `NODE_ENV` | Optional | `production` on Vercel |

Secrets must be set in the **Vercel project dashboard** (Settings → Environment Variables) then **Redeploy**. Do not commit `.env`.

## Live API checks (public endpoints)

Recorded against production; re-run after each deploy:

| Route | Expected |
|-------|----------|
| `GET /api/solana/config` | 200, `network: "devnet"`, `initialized: true` |
| `GET /api/supply` | 200, supply fields |
| `GET /api/market` | 200 |
| `GET /api/leaderboard` | 200 |
| `GET /api/block-owner/:id` | 200; when owned, may include `signatures` / `explorerUrl` |

## Rate limits (issue #5)

- Quote: 30 / min / IP
- Purchase build: 10 / min / IP
- Covered by `src/rateLimit.js` + tests in `test/rateLimit.test.js`

## Signature discovery (issue #4)

Receipt accounts do not store the signature on-chain. The server looks up recent signatures for the receipt pubkey via RPC:

- `GET /api/block-owner/:blockId` → `signatures`, `primarySignature`, `explorerUrl`
- `GET /api/receipt/:address/signatures` → list of signatures for a receipt account

## Operator-only remaining gates

- One documented operator purchase in Explorer (issue #3)
- Real privacy/support email on legal pages (issue #6)
- Confirm Helius Devnet env is live on Vercel after dashboard save + redeploy
