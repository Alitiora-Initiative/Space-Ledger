# Space Ledger

**Space Ledger** is an open-source shared digital-canvas prototype built on **Solana Devnet**. Its design contains 10 billion blocks with 100 pixel positions per block, for a theoretical capacity of 1 trillion pixel positions.

> **Network status:** The Space Ledger canvas application and its Anchor program are Devnet-only. Devnet SOL and Devnet USDC have no real-world value. The separate external token token is a Solana Mainnet asset; it is not the canvas program, does not represent ownership of canvas blocks, and is not required to test the Devnet application.

| | |
|---|---|
| **Live application** | [space-ledger-alitiora.vercel.app](https://space-ledger-alitiora.vercel.app) |
| **Source code** | [Alitiora-Initiative/Space-Ledger](https://github.com/Alitiora-Initiative/Space-Ledger) |
| **external token information page** | Token details are no longer part of this project. |
| **Canvas program (Devnet)** | `EbP7vsnMXPonTfriPUFynco69d69JiXpWbKnwVmz8sgG` |
| **Operator** | Joseph Mushelle Nyingeh · Alitiora Initiative · Kenya |
| **Contact** | [jaymnyon@gmail.com](mailto:jaymnyon@gmail.com) |
| **License** | MIT |

## Current product status

The repository contains a publicly accessible Devnet beta. The following are implemented in the current codebase:

- **On-chain whole-block purchases:** Anchor program instructions accept Devnet SOL or the configured Devnet USDC mint.
- **Linear bonding curve:** successful purchases advance the on-chain supply and affect the next block price.
- **Purchase receipts:** the program records buyer, block range, payment asset, paid units, curve price, fee and settlement time.
- **Wallet connectivity:** Wallet Standard-compatible Solana wallets, including Phantom and Solflare when exposed by the browser.
- **Grid and chunk API:** a virtualized canvas/grid experience and `/api/grid/chunk` endpoint for bounded block queries.
- **Quotes and transaction flow:** balance-aware quotes, wallet approval, transaction confirmation and Explorer links.
- **Supporting application pages and APIs:** grid, profile/dashboard, leaderboard, treasury and market interfaces.
- **Operational protections:** API rate limits, a short-lived config cache, server-side RPC configuration and HTTP security headers.
- **Developer resources:** automated Node.js tests, Rust/Anchor program source, local setup instructions and Devnet beta documentation.
- **Release 1 foundations:** pre-wallet purchase-intent recovery, private Devnet receipt-indexer tables and a replay-safe one-shot worker, installable PWA shell and device-tier guidance. Indexing remains inactive until server-side credentials and a worker are configured.

The repository records an operator-approved Devnet purchase and receipt in its historical beta-verification notes. That is evidence of a working test path, not evidence of broad independent adoption, production readiness or a security audit.

## Current limitations and planned work

| Area | Current status |
|---|---|
| Canvas application network | Solana Devnet |
| Whole-block purchases | Implemented for Devnet SOL and Devnet USDC |
| Individual pixel ownership | Not implemented |
| Transfers / secondary market for canvas blocks | Not implemented |
| Two-way buy-and-sell / redemption | Planned; not implemented |
| Historical chart based on confirmed on-chain activity | Planned; not implemented as a complete history visualisation |
| Independent program security audit | Not completed |
| Canvas application mainnet migration | Out of scope until separate technical, security and legal review |

Do not treat the separate external token token's Mainnet presence as a Mainnet deployment of the canvas application.

## Funding proposal and execution plan

The project operator confirms that a **$1,000 USD-equivalent funding application was submitted to the Solana Foundation on 2026-11-03**. The application requests milestone-based support for open-source development and public beta testing. The submission date is operator-reported; no funding award or disbursement has been confirmed.

**The application is not evidence of an award. Funding has not been confirmed in this repository.**

The proposal is divided into three planned milestones:

| Milestone | Proposed amount | Planned outcome |
|---|---:|---|
| 1. Devnet reliability, testing and verification | $350 | Expanded program/backend tests, reproducible Devnet checks and updated verification evidence |
| 2. Verifiable on-chain history and visualisation | $400 | History API and charts derived from confirmed program events/receipts, with honest empty/error states |
| 3. Independent public beta and ecosystem contribution | $250 | Target 10 independent test wallets, 20 confirmed Devnet purchase receipts and 3 external feedback reports, plus a public adoption report |

The proposed delivery window is eight weeks after an agreed project start. These amounts and adoption numbers are **proposal targets**, not funds received or results already achieved.

The detailed scope, tasks, acceptance criteria, evidence log, schedule and AI coding-agent instructions are maintained in [ROADMAP.md](ROADMAP.md), under **Grant Proposal Execution Roadmap**. All milestone statuses must remain accurate and evidence-based.

The project is independently maintained and currently operates with limited capital. Development instructions therefore prioritise existing dependencies, Solana Devnet, public/free-tier tooling and low-cost reproducible workflows. Do not introduce paid APIs, subscriptions, infrastructure commitments or other recurring costs without explicit maintainer approval.

## Mainnet cutover checklist

The application is network-configurable but remains fail-closed for production until every Mainnet identity is explicitly supplied. Do not reuse Devnet addresses or the Devnet program ID.

Set these production variables together: `SOLANA_NETWORK=mainnet-beta`, `SOLANA_RPC_URL`, `SOLANA_PROGRAM_ID`, `FEE_WALLET_ADDRESS`, `SOLANA_USDC_MINT`, `SOLANA_PYTH_PROGRAM`, `SOLANA_SOL_USD_FEED`, and `SOLANA_SOL_USD_FEED_ID`. Verify each address on Solana Mainnet, deploy the reviewed program with a controlled upgrade authority, run the migration/indexer verification, and only then switch the wallet network and public RPC configuration. Missing or incomplete Mainnet configuration intentionally prevents production startup.

The repository does not claim a Mainnet deployment until the program ID, upgrade authority, treasury, token mint, oracle feed, and deployment transaction have been independently recorded.

## How to test the Devnet beta

1. Install Phantom or Solflare, or another supported Solana wallet.
2. Switch the wallet to **Devnet**. Do not use Mainnet for the canvas purchase flow.
3. Obtain test SOL from a Solana Devnet faucet. Devnet USDC must also be a Devnet token.
4. Open the [live application](https://space-ledger-alitiora.vercel.app) and connect the wallet.
5. Open the purchase flow, request a Devnet quote, review the amount and approve the transaction in the wallet.
6. After confirmation, inspect the transaction and receipt using [Solana Explorer on Devnet](https://explorer.solana.com/?cluster=devnet).

For mobile testing, open the application in the Phantom or Solflare in-app browser and confirm that the wallet is on Devnet. See the [mobile guide](https://space-ledger-alitiora.vercel.app/pages/mobile.html).

Devnet RPC services can be rate-limited or temporarily unavailable. A failed request should be reported as a failed test, not counted as a successful purchase.

See the [Devnet Beta Guide](docs/Space-Ledger-Devnet-Beta-Guide.md) and [Beta Verification notes](docs/BETA_VERIFICATION.md) for additional procedures.

## The separate external token token

[Space Ledger (external token)](https://space-ledger-alitiora.vercel.app/pages/token.html) is a separate Solana Mainnet token. The repository identifies its mint as:

`42UNqmUTuKuKZ5mwo2r5y3cNoPv38P8fxAisqQLXdT6u`

The repository identifies its liquidity pool as:

`EPAsaZjCvMZitE8d65KAR7yxpFbt8gAZo8zNzQk4YQsy`

The token is speculative, is not equity, is not a claim on canvas blocks and is not required to access or test the Devnet canvas. Token-market activity must not be mixed with Devnet canvas purchase receipts, application usage or adoption metrics. Nothing in the grant proposal requests token liquidity or market-making funds.

## Optional builder support

The application has an optional support section separate from Devnet block purchases. Support is voluntary and is not required to use the application.

| Chain | Address displayed by the project |
|---|---|
| Solana | `ETuGxX6Znxr9q59THJtcYDJKt6RvCfN7wp79tRnbG1xG` |
| Arbitrum | `0x7CaC4214A4842c30D1E19adab492F62fAE449bed` |
| Bitcoin | `bc1q9sadwz9aymgj9sw3xhfjxtw9zser6tgqp8xm8t` |

## Local development

Requirements include Node.js/npm and the Solana/Anchor tooling needed for program work.

```bash
cp .env.example .env
npm install
npm test
npm start
```

For the Solana program build, use the repository's compile script in an environment with the required Solana program build tools installed:

```bash
npm run compile
```

Additional checks:

```bash
npm audit
```

Configuration notes:

- Keep `SOLANA_RPC_DEVNET` pointed at Solana Devnet.
- Keep `SOLANA_PROGRAM_ID` set to the published Devnet program ID.
- A private RPC API key belongs in the server-side environment only.
- Never commit `.env`, private keys, wallet JSON files, seed phrases or recovery phrases.
- Do not copy a Mainnet RPC URL into the Devnet configuration.

## Continuous integration

The GitHub Actions workflow [Rust](.github/workflows/rust.yml) runs `npm ci`, `npm test`, `cargo build` and `cargo test` on pushes to `main` and pull requests targeting `main`.

**Important build distinction:** the CI `cargo build` is a host Rust build, not a Solana SBF build artifact. The documented `npm run compile` command runs `cargo build-sbf` and requires the Solana program build toolchain. Do not treat a passing host build/test job as proof that a deployable SBF binary matches the on-chain program. The current repository also does not include a root `Anchor.toml` or an Anchor/SVM instruction integration suite; see [security review preparation](docs/SECURITY-REVIEW-PREPARATION.md).

## Security and data integrity

- The current canvas program is a Devnet prototype, not an audited production financial system.
- The repository's tests are not a substitute for an independent smart-contract audit.
- Do not represent planned features as implemented.
- Do not fabricate chart points, prices, volume, users, receipts, testimonials or adoption metrics.
- Show an empty or unavailable state when confirmed on-chain data is not available.
- Any Mainnet migration requires a separate review of program configuration, account constraints, oracle feeds, treasury controls, legal obligations, monitoring and security.

## Project documentation

- [Roadmap and Solana Foundation application milestones](ROADMAP.md)
- [Technical collaboration and outreach](docs/COLLABORATION-OUTREACH.md)
- [Devnet Beta Guide](docs/Space-Ledger-Devnet-Beta-Guide.md)
- [Beta Verification notes](docs/BETA_VERIFICATION.md)
- [Mainnet Migration Guide](docs/MAINNET-MIGRATION-GUIDE.md)
- [AI agent instructions](AGENTS.md)
- [GitHub Copilot instructions](.github/copilot-instructions.md)

## License

MIT. See [LICENSE](LICENSE). The project logo is described in the repository roadmap as operator-generated with AI assistance.
