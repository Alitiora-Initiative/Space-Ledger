# Space Ledger

Space Ledger is a shared digital-canvas prototype with 10 billion numbered blocks and 100 pixel positions per block. It has a real Express API and an Anchor program for **test-only purchases on Solana Devnet**. It is not a mainnet marketplace, investment product, or self-updating agent system.

The project is independently inspired by the pixel-by-pixel format of [The Million Dollar Homepage](https://www.webdesignmuseum.org/web-design-history/million-dollar-homepage-2005), launched in 2005. Space Ledger is not affiliated with that project.

## Current Features

- Static HTML pages in `public/`, served locally by Express and as Vercel static assets.
- Server routes in `src/index.js` for model estimates, Devnet state, quotes, unsigned purchase transactions, receipts, grid ownership, portfolio history, and holder rankings.
- Anchor program in `programs/space-ledger/` which accepts Devnet SOL or the configured Devnet USDC mint, checks the SOL/USD feed for SOL payments, and atomically updates supply with a purchase receipt.
- On-chain receipts are the persistence layer for purchases. This build does not use a separate database or store wallet activity in an application account system.
- Wallet Standard discovery for wallets exposed by the current browser. A wallet must advertise Solana Devnet and legacy `signAndSendTransaction` support to appear. Phantom, Solflare, or Trust Wallet may be discovered when their installed extension or in-app browser exposes those capabilities. Mobile wallet discovery outside an injected wallet browser is not yet implemented.
- The attached MetaMask instructions describe `@metamask/connect-solana`; this repository does not bundle that client, so MetaMask Connect is **not claimed as supported** by this build. Its [published package license](https://raw.githubusercontent.com/MetaMask/connect-monorepo/main/packages/connect-solana/LICENSE) limits use to non-commercial purposes; obtain appropriate permission before considering it for this project.
- A read-only EVM RPC explorer with an allowlist of public read methods. It is separate from the Solana purchase flow and does not connect to EVM wallets.
- Privacy, Terms, and Cookie Policy pages that document current code behavior. These are incomplete drafts, not a global legal compliance claim.

The site does not create or run autonomous agents, upgrade itself when opened, store tracking cookies, load analytics, or embed third-party frames. A normal Devnet transaction simulation is performed before requesting a signature; it is an RPC preflight, not simulated UI activity.

## Architecture

```text
Browser pages (public/)
  ├── Wallet Standard discovery and user-approved signing (public/js/wallet.js)
  └── Fetch requests
       └── Express API (src/index.js)
            ├── Solana RPC and receipt validation (src/solanaService.js)
            ├── Read-only EVM RPC allowlist (src/rpcRouter.js)
            └── Anchor program state and receipts (programs/space-ledger/)
```

Confirmed purchases are read from Solana program accounts. The current portfolio, activity, and leaderboard routes scan receipt accounts through RPC; this is suitable only for a small Devnet beta. A production-scale indexer and pagination are not included. Vercel deployment can run the Express entry point and serves files from `public/`, but the current production deployment and its environment settings must be verified independently.

## Wallet Purchase Flow

1. The app discovers wallets through Wallet Standard; it does not keep a hardcoded adapter list.
2. A visitor requests a quote based on current Devnet supply. The backend validates the amount, asset, supply, fixed treasury, and (for SOL) current Pyth feed data.
3. The server returns an **unsigned** transaction. The browser simulates it against Devnet.
4. If simulation succeeds, the selected wallet receives the transaction. The user must review and approve it; the app never requests seed phrases or private keys.
5. The app waits for Devnet confirmation and verifies the receipt account before showing the purchase as confirmed.

Devnet SOL and Devnet USDC have no real-world value. The program pins the network, treasury, Devnet mint, and program ID in code. The current program ID is `EbP7vsnMXPonTfriPUFynco69d69JiXpWbKnwVmz8sgG`; the fixed test-payment recipient is `EDZjEbRAtqyC8z6ta6PYHX161Xynt13tWpd7orKERkbz`. No purchase was signed or sent as part of this update.

The published model begins at $0.001 per block and ends at $1,000 per block across the 10-billion-block range. The test protocol fee is $0.10 per purchase. Quotes can change with on-chain supply and, for SOL, the Pyth price. A model estimate is not a market price or promise of return.

## Pages

- `/` - project, supply, and model overview.
- `/pages/purchase.html` - estimates, Devnet quotes, and wallet-approved purchase flow.
- `/pages/grid.html` - browse block and pixel positions with verified ownership when available.
- `/pages/market.html` - confirmed Devnet receipts and the primary-sale model; not an exchange or candlestick chart.
- `/pages/leaderboard.html` - ranking of original buyers from confirmed receipts; there are no transfers.
- `/pages/profile.html` and `/pages/dashboard.html` - public receipt history and wallet holdings.
- `/pages/treasury.html` - fixed Devnet destination and on-chain balances.
- `/pages/network.html` - read-only EVM RPC explorer.
- `/pages/swap.html` - explanatory page only; transfers and resales are not implemented.
- `/pages/privacy.html`, `/pages/terms.html`, `/pages/cookies.html` - draft notices.

## API

| Route | Purpose |
| --- | --- |
| `GET /api/solana/config` | Devnet program, treasury, supply, and public wallet RPC configuration |
| `GET /api/solana/quote?asset=SOL&amount=1` | Quote using live Devnet state and the selected test asset |
| `POST /api/purchase` | Build an unsigned purchase transaction; never submits it |
| `GET /api/supply`, `/api/stats`, `/api/treasury` | Devnet supply, receipt counts, and treasury balances |
| `GET /api/grid?block=0`, `/api/block-owner/:blockId` | Grid data and receipt-backed ownership lookup |
| `GET /api/blocks/:address`, `/api/portfolio/:address` | Receipt-backed wallet holdings and history |
| `GET /api/market`, `/api/leaderboard` | Confirmed receipt data and original-buyer ranking |
| `GET /api/price/:blockId`, `/api/price/range` | Published curve estimates, not a live market quote |
| `GET /api/networks`, `POST /api/rpc` | Supported EVM networks and allowlisted read-only queries |

The app deliberately does not expose pretend `/api/stream`, vesting, swap, or generic config routes. Unsupported write RPC calls are rejected.

## Run Locally

Requirements: Node.js 22 or later. A Solana CLI with `cargo build-sbf` is additionally required to compile the on-chain program.

```sh
npm ci
cp .env.example .env
npm start
```

Open [http://localhost:3000](http://localhost:3000). In PowerShell, copy `.env.example` to `.env` with `Copy-Item .env.example .env`.

Set `SOLANA_PROGRAM_ID` to the intended Devnet program ID to enable chain-backed endpoints. `SOLANA_RPC_DEVNET` is optional; if unset, the server uses Solana's public Devnet endpoint. Keep any RPC credential on the server. Never commit private keys, seed phrases, or RPC credentials.

## Verification

```sh
npm test
cargo test --manifest-path programs/space-ledger/Cargo.toml
npm run compile
```

The automated JavaScript tests cover API behavior, request validation, block IDs, curve math, Pyth feed validation, receipt validation, security headers, and Wallet Standard discovery/signing. They use a mocked wallet object for deterministic unit tests; they do not simulate successful product purchases. The browser purchase flow separately simulates its real unsigned Devnet transaction before the wallet prompt. Rust tests cover program math. Tests do not prove a successful live purchase, full accessibility conformance, or contract security.

## Not Implemented

- Mainnet transactions or real-money activity.
- MetaMask Connect Solana bridge (pending license review/permission), mobile QR/WalletConnect flow, or wallets that do not expose the required Wallet Standard Devnet features.
- Block transfers, resales, swap routes, liquidity, token creation, or Jupiter integration.
- TradingView candles, executed-trade data, GPS, regional rankings, or token hosting.
- An independent database, receipt indexer, streaming service, or signature archive. Current reads use on-chain receipts and RPC scans; receipts do not include the originating transaction signature.
- Autonomous agents or code that modifies the project at page-load time.

## Privacy, Rights, and Deployment

The current page code does not set cookies or browser storage, run analytics/tracking scripts, or embed third-party frames. A cookie-consent banner is not needed for the site's own current code on that basis; the deployed host, RPC provider, and any later integrations must be checked independently. Wallet actions and chain queries contact external wallet/RPC services when requested.

The legal pages are not ready for public launch: the operator still needs to provide a legal name, postal contact, privacy contact, and hosting/RPC provider details. The logo's authorship and redistribution permission are not documented. Review applicable Kenya and target-country requirements with qualified counsel before offering a global service. The repository's code license is MIT; the bundled Solana web3 library has its own license notice.

The Vercel configuration applies response-security headers. Vercel's Express support can run the `src/index.js` app, with static assets served from `public/`; an authenticated deployment and live production verification are still required. Pushing code does not prove Vercel has deployed it.

See [ROADMAP.md](ROADMAP.md) for the current TODO list and [the detailed beta guide](docs/Space-Ledger-Devnet-Beta-Guide.md). The repository's Wiki setting is enabled, but GitHub has not initialized the Wiki repository yet; a maintainer must create its first page in GitHub before the guide can be pushed there.

## License

MIT. See [LICENSE](LICENSE).
