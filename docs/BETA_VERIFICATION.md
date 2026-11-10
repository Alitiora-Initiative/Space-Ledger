# Devnet beta verification notes

This document contains a historical verification record and a repeatable checklist. It is not a claim that all checks were rerun on the date this file was last edited.

**Historical automated check recorded:** 2026-10-14  
**Application:** https://space-ledger-alitiora.vercel.app/  
**Repository branch:** `main`  
**Canvas network:** Solana Devnet

> The Space Ledger canvas application remains Devnet-only. The separate external token token is on Solana Mainnet and must not be confused with the canvas program or its Devnet usage metrics. Devnet SOL and Devnet USDC have no real-world value.

## Funding application status

The project operator confirms that the $1,000 USD-equivalent Solana Foundation funding application was submitted on **2026-11-03**. No funding award or disbursement has been confirmed. The milestone amounts below are proposed allocations, not received funds.

## Program and environment

| Item | Value |
|---|---|
| Canvas program ID | `EbP7vsnMXPonTfriPUFynco69d69JiXpWbKnwVmz8sgG` |
| Devnet USDC mint | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |
| SOL/USD oracle feed account | `7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE` |
| Default RPC | `https://api.devnet.solana.com` |

Environment variable names:

| Name | Required | Notes |
|---|---|---|
| `SOLANA_PROGRAM_ID` | Yes for live program reads/purchases | Use the Devnet canvas program ID above |
| `SOLANA_RPC_DEVNET` | Optional | Devnet RPC endpoint; a dedicated Devnet provider may improve reliability |
| `NODE_ENV` | Optional | Set to `production` on Vercel |

Set private RPC URLs and API keys in the Vercel project environment, then redeploy. Never commit `.env`, private keys, wallet JSON files, seed phrases or provider credentials. Do not put a Mainnet RPC URL into the Devnet configuration.

## API verification checklist

Run these checks against the deployed application only when the Devnet program and RPC are configured and available.

| Route | Expected behaviour |
|---|---|
| `GET /api/solana/config` | Returns public configuration including `network: "devnet"`, program information and the non-secret RPC provider class |
| `GET /api/supply` | Returns total supply and the program's current supply when account reads succeed |
| `GET /api/market` | Returns market/curve information; distinguish model/next-block estimates from actual trade history |
| `GET /api/grid/chunk` | Returns the requested bounded grid chunk |
| `GET /api/block-owner/:blockId` | Returns receipt/ownership lookup data when available; may return an unavailable response when lookup cannot be verified |
| `GET /api/receipt/:address/signatures` | Looks up transaction signatures associated with a receipt where RPC history is available |
| `GET /api/leaderboard` | Returns leaderboard data when the required on-chain data is available |

Do not assume every endpoint must always return HTTP 200. A 4xx/5xx response, timeout, rate limit or unavailable RPC should be recorded as a test result and investigated, not described as a successful verification.

## Pricing, settlement and receipt checks

- Obtain quotes from the deployed quote endpoint rather than relying on a frontend estimate.
- Confirm that quotes use the current on-chain supply.
- Confirm that the buyer explicitly approves the transaction in their wallet.
- After a successful transaction, verify the transaction signature on Solana Explorer with the cluster set to Devnet.
- Inspect the receipt and confirm the buyer, starting block, block count, payment asset and paid amount.
- Confirm that the program's current supply advances by the purchased block count.
- For SOL purchases, verify oracle freshness/confidence validation and slippage protection.
- For USDC purchases, verify the configured Devnet USDC mint, token-account ownership and six-decimal handling.

A model curve estimate is not a confirmed trade. A receipt is not evidence of a secondary-market sale. Do not infer market volume, active users or adoption from page views or unconfirmed quotes.

## Application rate limits

The current limiter configuration in `src/index.js` is:

| Operation | Configured limit |
|---|---:|
| Quote endpoint | 20 requests per minute per IP |
| Purchase-build endpoint | 8 requests per minute per IP |
| Read endpoints using the read limiter | 60 requests per minute per IP |

These are application-level, per-instance limits; deployment/runtime behaviour can vary. The values in this table must be updated if the source configuration changes.

## Continuous integration

The repository's GitHub Actions workflow [Rust](../.github/workflows/rust.yml) runs `cargo build` and `cargo test` for the Anchor program on pushes to `main` and pull requests targeting `main`. It does not run the Node.js test suite.

## Local automated checks

From the repository root:

```bash
npm install
npm test
npm audit
```

To build the Solana program, use the repository script in an environment with the required Solana program build tools installed:

```bash
npm run compile
```

Record exact commands, exit codes and relevant output. If a command cannot run because a toolchain, network endpoint or dependency is unavailable, record that limitation instead of claiming the check passed.

## Historical evidence already recorded

The repository's earlier beta-verification record documents an operator-approved Devnet purchase, an associated receipt account and a successful transaction signature from approximately 2026-10-14. This is historical evidence of an end-to-end operator test.

It does not establish:
- independent user adoption;
- 10 independent wallets or 20 independent confirmed receipts;
- sustained production availability;
- a completed security audit;
- mainnet readiness;
- completed grant milestones.

## Grant milestone evidence

The project operator reports that a $1,000 USD-equivalent Solana Foundation funding application was submitted. An application is not an award, and funding receipt is not confirmed by this document.

| Proposed milestone | Amount | Evidence required before marking complete |
|---|---:|---|
| 1. Devnet reliability, testing and verification | $350 | Passing expanded tests, repeatable Devnet smoke test, transaction signature/receipt and updated verification notes |
| 2. Verifiable on-chain history and visualisation | $400 | Public history endpoint and chart, source-backed data tests, data dictionary and independently inspectable Devnet examples |
| 3. Independent public beta and ecosystem contribution | $250 | At least 10 independent test wallets, 20 confirmed Devnet purchase receipts, 3 external feedback reports and a public adoption report |

The targets above are proposed future acceptance criteria, not achieved metrics. Use [ROADMAP.md](../ROADMAP.md) as the controlling source for task scope, schedule, acceptance rules and the evidence log.

## Evidence record template

Add a dated entry when a test is actually run:

| Date/time (UTC) | Commit/deployment | Check | Result | Evidence |
|---|---|---|---|---|
| YYYY-MM-DD HH:MM | Commit SHA / deployment URL | Command, endpoint or transaction | Pass / Fail / Blocked | Link to logs, signature, receipt or report |

Do not publish secrets or personal tester information. Obtain permission before publishing attributable feedback; aggregated or anonymised feedback is preferred.

