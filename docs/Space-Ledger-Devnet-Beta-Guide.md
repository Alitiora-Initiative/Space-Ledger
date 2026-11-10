# Space Ledger Devnet Beta Guide

**Operator:** Joseph Mushelle Nyingeh · Alitiora Initiative · Kenya  
**Project status:** Independent, unincorporated project; public Devnet prototype  
**Application:** https://space-ledger-alitiora.vercel.app/  
**Source:** https://github.com/Alitiora-Initiative/Space-Ledger

> **Network and value warning:** The Space Ledger canvas application and its Anchor program run on Solana Devnet. Devnet SOL and Devnet USDC are test assets with no real-world value. The separate external token token is a Solana Mainnet asset; it is not the canvas program, does not represent ownership of canvas blocks, and is not required to use this beta.

## What the beta currently does

- Connects Solana Wallet Standard-compatible wallets exposed by the browser, including Phantom and Solflare.
- Requests a balance-aware quote for whole-block purchases.
- Supports the program's Devnet SOL and configured Devnet USDC purchase paths.
- Requires the user to review and approve the transaction in their wallet.
- Records purchase details in an on-chain receipt and advances the global block supply.
- Exposes grid, profile/dashboard, leaderboard, treasury and market-related interfaces and APIs.
- Provides transaction/receipt lookup paths and Solana Explorer links where available.

The canvas is designed for 10 billion blocks with 100 pixel positions per block. The current purchase flow settles **whole blocks**. It does not implement individual pixel ownership.

## Devnet configuration

| Item | Value |
|---|---|
| Network | Solana Devnet |
| Canvas program ID | `EbP7vsnMXPonTfriPUFynco69d69JiXpWbKnwVmz8sgG` |
| Devnet USDC mint | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |
| SOL/USD oracle feed account | `7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE` |

The program's treasury and token-account constraints are defined in the Anchor program. Do not substitute a different program, mint, treasury or oracle account when testing.

## How to run a basic beta test

1. Use Phantom, Solflare or another supported wallet.
2. Switch the wallet's active network to **Solana Devnet**.
3. Obtain test SOL from the [Solana Devnet faucet](https://faucet.solana.com/). Test USDC must be the configured Devnet USDC asset, not Mainnet USDC.
4. Open the [Space Ledger application](https://space-ledger-alitiora.vercel.app/).
5. Connect the wallet.
6. Open the purchase flow and request a quote for a small number of whole blocks.
7. Review the asset, amount, fee and transaction details in the application and wallet.
8. Approve the transaction only if the wallet shows the expected Devnet transaction.
9. After confirmation, inspect the transaction using [Solana Explorer on Devnet](https://explorer.solana.com/?cluster=devnet).
10. Where available, inspect the associated receipt and confirm that the buyer, block range and payment information match the transaction.

For mobile testing, open the application through the Phantom or Solflare **in-app browser**, then confirm that the wallet is on Devnet. See the application's [mobile guide](https://space-ledger-alitiora.vercel.app/pages/mobile.html). WalletConnect QR support is not part of the current beta.

## What to record when reporting a test

Please include:

- Date and approximate time of the test (UTC is preferred).
- Wallet type and confirmation that the network was Devnet.
- Application page or action being tested.
- Whether the quote, wallet approval and transaction confirmation succeeded.
- Transaction signature and receipt address, if a transaction was confirmed.
- A concise description of any error, with screenshots that do not expose private information.

Never submit a seed phrase, recovery phrase, private key, wallet JSON file or API secret. Do not send funds to someone claiming to be a beta tester or support agent.

## Known limitations

- The application program is Devnet-only.
- Devnet SOL and Devnet USDC have no real-world value.
- Purchases are whole-block purchases; individual pixel ownership is not implemented.
- Transfers, a canvas-block secondary market and two-way block redemption are not implemented.
- A complete historical chart sourced from confirmed on-chain activity is planned work; do not treat model price estimates as historical trades.
- Receipt lists and RPC-backed lookups have limits and are not a production indexing service.
- Public Devnet RPC providers can rate-limit or temporarily fail. A failed request must not be counted as a successful purchase.
- The program has not been represented as independently audited or mainnet-ready.

## Separate external token token

The external token token has a separate Solana Mainnet mint and liquidity pool. It is not the Devnet canvas program or a claim on canvas blocks. Do not combine token-market activity with Devnet canvas purchases, receipts, supply or adoption metrics. The grant-funded canvas milestones do not request token liquidity or market-making funds.

## Grant proposal milestones and beta targets

The project operator confirms that a $1,000 USD-equivalent funding application was submitted to the Solana Foundation on **2026-11-03**. Submission does not mean that funding has been awarded or received; no award or disbursement has been confirmed.

The proposed milestone allocation is:

| Milestone | Proposed amount | Scope |
|---|---:|---|
| 1. Devnet reliability, testing and verification | $350 | Expand tests, reproduce Devnet checks and publish verification evidence |
| 2. Verifiable on-chain history and visualisation | $400 | Build history APIs and charts based on confirmed program events/receipts |
| 3. Independent public beta and ecosystem contribution | $250 | Target 10 independent test wallets, 20 confirmed Devnet purchase receipts and 3 external feedback reports |

The adoption figures are future targets, not claims about current usage. Count unique wallets and confirmed receipts using a documented method. Do not create artificial wallets, transactions, testimonials or feedback to meet a target.

The proposed delivery period is eight weeks after an agreed project start. See [ROADMAP.md](../ROADMAP.md), section **Grant Proposal Execution Roadmap**, for detailed tasks, acceptance criteria, evidence requirements and AI-assisted implementation instructions.

## For contributors and AI coding assistants

Read the repository's [AGENTS.md](../AGENTS.md), [README.md](../README.md) and [ROADMAP.md](../ROADMAP.md) before making changes. Work on one small task at a time, inspect existing implementation before rewriting it, add tests and report the exact checks run. Keep the application on Devnet. Never fabricate data or mark planned work complete without evidence.



## Release 1 receipt indexer

A private, one-shot Devnet indexer has been added. It writes verified purchase receipts, signature-linked purchase events and a replay state to separate Supabase tables. It is deliberately not scheduled or always-on in this release. Configure `SOLANA_PROGRAM_ID`, `SUPABASE_URL` and `SUPABASE_SECRET_KEY` on a trusted worker, then run `npm run indexer:once`. Never put the key in browser code. A status endpoint reports whether storage is configured and when the index was last updated.

Phone users can open the site in the official Phantom or Solflare in-app browser. Desktop/laptop and tablet users receive the full browser interface, with optional PWA installation. The PWA caches static shell files only; API data and transactions remain online-only.
