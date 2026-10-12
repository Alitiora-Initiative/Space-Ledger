# Space Ledger Devnet Beta Guide

This page documents the repository as implemented. It is an engineering guide, not a promise of production availability, a security audit, legal advice, or an offer to sell an asset.

## Product State

Space Ledger is a shared digital-canvas prototype. Its address space is 10 billion sequential blocks with 100 pixel positions per block. The active purchase and ownership program is Solana Devnet-only. Devnet tokens have no real-world value.

The product can read Devnet accounts, build an unsigned transaction, simulate it through Solana RPC, request user approval in a wallet, and verify a confirmed receipt. Availability on a particular deployment depends on program and RPC environment configuration. This update did not sign or send a purchase.

No agents autonomously edit or deploy the app. No separate application database is configured: confirmed purchase receipts and supply state live on Solana Devnet. The web server does not persist user accounts or wallet histories.

## System Layout

| Area | Location | Responsibility |
| --- | --- | --- |
| Website pages and assets | `public/` | Static HTML, CSS, locally served browser code, and the site logo |
| Express routes | `src/index.js` | API responses, request validation, and security headers |
| Solana integration | `src/solanaService.js` | Quotes, transaction construction, state reads, and receipt account validation |
| Block labels and price model | `src/blockId.js`, `src/bondingCurve.js` | Deterministic block labels and estimates |
| EVM read-only explorer | `src/rpcRouter.js` | Fixed set of public EVM RPC networks and allowlisted read methods |
| Solana program | `programs/space-ledger/src/lib.rs` | Devnet purchase settlement, supply cursor, and receipt accounts |
| Automated tests | `test/` | API, pricing, receipt validation, syntax, security headers, and wallet integration coverage |

Vercel serves assets from `public/` and can detect the Express entry under `src/index.js`; see [Vercel's Express deployment guide](https://vercel.com/docs/frameworks/backend/express). Local development runs `npm start`. The app currently uses RPC scans rather than a database-backed indexer, which is not appropriate for high-volume production.

## Wallet Discovery

The browser application listens for `wallet-standard:register-wallet` and announces `wallet-standard:app-ready`. Registered wallets are filtered at runtime. A wallet is offered only when it declares:

- the `solana:devnet` chain;
- the standard connect feature;
- the `solana:signAndSendTransaction` feature; and
- legacy transaction support.

This follows the event-based discovery model in the [Wallet Standard application implementation](https://github.com/wallet-standard/wallet-standard/blob/master/packages/core/app/src/wallets.ts). No wallet list is hardcoded. Phantom, Solflare, or Trust Wallet may appear only if the user's current browser or in-app browser exposes a compatible Wallet Standard wallet.

The separate MetaMask requirements in the supplied notes refer to MetaMask's official [Solana Connect client](https://github.com/MetaMask/metamask-docs/blob/main/metamask-connect/solana/reference/methods.md). This repository does not bundle `@metamask/connect-solana`; MetaMask Connect is not advertised as supported. Its [published package license](https://raw.githubusercontent.com/MetaMask/connect-monorepo/main/packages/connect-solana/LICENSE) limits use to non-commercial purposes, so obtain appropriate permission before considering distribution with this project. The React `WalletProvider` sample in the notes is not applicable to this plain HTML/JavaScript app, and its mainnet endpoint must not be used in a Devnet-only purchase flow.

Injected wallet discovery does not cover external mobile-wallet handoff or QR connection. Wallet Standard does not make every wallet available on every browser, and a wallet can still reject a connection or transaction.

## Purchase and Receipt Flow

1. The page requests `/api/solana/config` and shows an unavailable state if the configured Devnet program cannot be read.
2. `/api/solana/quote` reads current supply and calculates the user's test purchase. SOL quotes validate the Pyth SOL/USD feed; USDC uses the pinned Devnet mint.
3. `POST /api/purchase` constructs an unsigned transaction only. The program enforces the starting supply, block count, token mint, fixed treasury, and slippage budget on-chain.
4. The browser calls Solana `simulateTransaction` on Devnet. A successful preflight does not guarantee the later transaction will succeed.
5. After the visitor chooses to buy, the wallet receives the serialized transaction. The wallet presents its own approval UI. The app never requests a seed phrase or private key.
6. The app waits for Devnet confirmation and re-reads the receipt before reporting the purchase as confirmed.

The purchase flow checks that the freshly built transaction still matches the displayed supply, range, and curve total. It caps the on-chain budget at the freshly quoted amount so a stale or increased quote is not silently substituted; if supply has moved, the user must request a new quote.

The program stores a singleton configuration account with the current supply cursor and a purchase receipt for each purchase. Receipt data includes original buyer, start block, count, payment asset and units, model amount, fee, and settlement time. The receipt PDA is derived from the `receipt` seed and starting block. Receipts do not currently store the transaction signature and are not transferable assets.

The fixed Devnet program ID is `EbP7vsnMXPonTfriPUFynco69d69JiXpWbKnwVmz8sgG`. The fixed test treasury is `EDZjEbRAtqyC8z6ta6PYHX161Xynt13tWpd7orKERkbz`. The Devnet USDC mint is `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`. Never treat any of these Devnet values as mainnet configuration.

## API Reference

| Endpoint | Description |
| --- | --- |
| `GET /api/solana/config` | Public Devnet configuration and current on-chain state |
| `GET /api/solana/quote?asset=SOL&amount=1` | Current quote for SOL or USDC |
| `POST /api/purchase` | Return an unsigned serialized purchase transaction |
| `GET /api/supply` | Total and current Devnet supply |
| `GET /api/stats` | Confirmed receipt counts and fee totals |
| `GET /api/treasury` | Fixed recipient and observed Devnet balances |
| `GET /api/grid?block=000A` | Ten-by-ten pixel view plus receipt-backed ownership state |
| `GET /api/block-owner/:blockId` | Verified owner from a confirmed receipt |
| `GET /api/blocks/:address` | Confirmed receipts for a wallet |
| `GET /api/portfolio/:address` | Receipt ranges and aggregate block count |
| `GET /api/market` | Primary-sale model estimate and confirmed receipts, not trade history |
| `GET /api/leaderboard` | Original-buyer ranking from validated receipts |
| `GET /api/price/:blockId`, `GET /api/price/range` | Formula estimates, not a live market quote |
| `GET /api/networks`, `POST /api/rpc` | EVM read-only explorer configuration and allowlisted public reads |

The prior generic config, genesis, vesting, streaming, and swap API placeholders have been removed. EVM write methods are rejected. `/api/purchase` only builds a transaction; it never signs or submits one.

## Configuration

Copy `.env.example` to `.env` and set:

| Name | Purpose |
| --- | --- |
| `SOLANA_PROGRAM_ID` | Enables program-specific Devnet reads and transaction construction |
| `SOLANA_RPC_DEVNET` | Optional server-side Devnet RPC endpoint; defaults to public Devnet RPC |
| `PORT` | Local server port (default `3000`) |
| `NODE_ENV` | Runtime environment |

The network and treasury are pinned in application/program code rather than being user-selectable environment settings. Do not add a `PRIVATE_KEY`, wallet recovery phrase, or secret to browser code or Git. If the RPC provider requires a credential, keep it in server environment variables and review the provider's terms and logs.

## Local Checks

```sh
npm ci
npm test
cargo test --manifest-path programs/space-ledger/Cargo.toml
npm run compile
npm start
```

`npm run compile` requires Solana CLI tooling that provides `cargo build-sbf`. Automated JavaScript wallet tests use a deterministic test wallet and do not contact a wallet provider. API tests start a local HTTP server. No automated test signs or sends a purchase.

## Privacy, Cookies, and Copyright

The current browser code does not set cookies, local storage, or session storage; it does not load analytics or advertising code and contains no third-party iframe embed. A wallet and RPC provider receives data only when a visitor asks the page to perform that feature. Hosting providers may process IP address, request, browser, and error logs. Production provider settings and retention are not defined in this repository.

The operator has stated Kenya as their home country but has not supplied a legal name, postal address, or privacy contact. The Privacy, Terms, and Cookie Policy pages are explicitly incomplete drafts. They do not certify compliance in Kenya or globally. Before public launch, identify the actual data controller, hosting/RPC providers, retention, and transfer locations, then obtain qualified review for Kenya and each target jurisdiction.

The root code is MIT-licensed. The bundled `@solana/web3.js` browser file has a separate local license notice. The origin and permission to redistribute `public/img/logo.jpg` have not been verified. Third-party names are nominative references only; no vendor endorsement is implied.

## Deferred Work

- Verified transaction-signature history and a scalable receipt indexer.
- MetaMask's official Solana Connect client and a tested mobile wallet connection flow.
- Accessibility and contrast testing across browsers, zoom, screen readers, and mobile assistive technologies.
- Independent program review and deployment/operations monitoring.
- Any transfer, resale, swap, token issuance, regional ranking, GPS, or trading chart. These require security, data, and legal review before implementation.

The current page displays a primary-sale model and confirmed receipts, not candlesticks. It does not connect Jupiter, create tokens, or claim buy/sell activity.
