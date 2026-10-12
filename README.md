# Space Ledger

Space Ledger is a shared digital canvas made of 10 billion numbered blocks, each containing a 10 × 10 grid (100 pixels). The combined address space is 1 trillion pixel positions. Visitors can explore the grid, connect Phantom, and test primary block purchases settled on Solana Devnet.

The concept takes inspiration from [The Million Dollar Homepage](https://www.webdesignmuseum.org/web-design-history/million-dollar-homepage-2005), Alex Tew's pixel advertising page launched in **2005**. Space Ledger is an independent project and is not affiliated with it.

## App pages

- **Home** (`/`): project overview, supply and pricing summary, and links to the main tools.
- **Pricing** (`/pages/purchase.html`): quotes and wallet-approved Devnet purchase flow.
- **Grid** (`/pages/grid.html`): browse numbered blocks.
- **Sale activity** (`/pages/market.html`): live Devnet supply, confirmed purchase receipts, and the primary-sale model estimate.
- **Leaderboard** (`/pages/leaderboard.html`): top wallets ranked by blocks in confirmed purchase receipts.
- **Treasury**, **Network**, **Dashboard**, and **Profile**: project status, network configuration, wallet holdings, and purchase history.
- **Privacy**, **Terms**, and **Cookies**: notices under `/pages/`; these remain drafts until the operator identity and contact details are confirmed.

The product name shown in the interface is **Space Ledger**. The app does not run autonomous agents or upgrade itself when visited.

## Devnet implementation

This repository contains a Devnet-only primary-purchase and ownership implementation. The production deployment is configured for Solana Devnet; live availability still depends on RPC and deployment health. A Devnet transaction was not signed or sent during this code update.

Backend Solana reads use the server-side `SOLANA_RPC_DEVNET` endpoint when configured, with the official Devnet RPC as a fallback. Keep provider credentials in server environment variables; the browser-facing wallet configuration does not expose the private endpoint. Mainnet configuration is not used by this Devnet-only app.

- Phantom wallet purchase approvals for Devnet SOL and the Devnet USDC mint. Wallet addresses are public chain data; the application does not request recovery phrases or private keys.
- An Anchor Solana program that accepts payment, records a purchase receipt, and advances the sold-block supply atomically.
- An unsigned purchase is simulated against Devnet before the browser requests wallet approval. A successful simulation is not a guarantee of later confirmation; users must review the transaction in their wallet.
- SOL-to-USD conversion checked on-chain against a configured Pyth SOL/USD feed. The program checks feed identity, confidence, and freshness.
- A fixed receiving wallet, `EDZjEbRAtqyC8z6ta6PYHX161Xynt13tWpd7orKERkbz`, for purchase proceeds.
- Validated receipt-based ownership lookups, live supply and purchase statistics, a top-holder ranking, and a wallet portfolio with confirmed purchase history.
- Compact labels such as `000A`–`999A`, then `000B`–`999B`, continuing through `Z`, `AA`, and onward. Numeric block numbers are canonical.

The configured Devnet program ID is `EbP7vsnMXPonTfriPUFynco69d69JiXpWbKnwVmz8sgG`. The app is pinned to Devnet; changing an environment variable cannot switch it to mainnet. The program's upgrade authority and security have not been independently audited.

The displayed curve starts at $0.001 per block and rises linearly toward $1,000. A $0.10 protocol fee is added to each purchase. Network transaction fees and any rent for new on-chain accounts are separate. Devnet tokens have no real-world value.

## Try a purchase

1. Install Phantom and switch its network to **Devnet**.
2. Fund the connected wallet with Devnet SOL using the [Solana faucet](https://faucet.solana.com/). For USDC purchases, obtain tokens for the Devnet USDC mint `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` from a Devnet token faucet.
3. Open Pricing, select SOL or USDC, enter a budget, and request a quote.
4. The app simulates the unsigned transaction, then Phantom opens for review. Check the network and payment details in Phantom and approve only if they match. The app records ownership only after the confirmed on-chain receipt is found.
5. Open Profile with the same wallet connected to see its verified purchase ranges.

Block labels are a convenience for entering positions; the purchase screen's quote determines the contiguous range available at the current supply. A receipt records the original buyer and range. The profile history links to receipt accounts; the current receipt format does not store transaction signatures. Transfer/resale support is not implemented, so do not treat receipts as transferable NFTs.

## Run locally

Requirements: Node.js 22 or later.

```sh
npm install
copy .env.example .env
npm start
```

Open [http://localhost:3000](http://localhost:3000). On macOS or Linux, use `cp .env.example .env` instead of `copy`.

Set `SOLANA_PROGRAM_ID=EbP7vsnMXPonTfriPUFynco69d69JiXpWbKnwVmz8sgG` and the public `FEE_WALLET_ADDRESS` in `.env` to enable the on-chain API locally. The fee wallet is public configuration, never a private key. Never place seed phrases or private keys in this repository or in browser code.

The default RPC endpoint is Solana's public Devnet endpoint. A deployment may configure a different Devnet RPC provider; provider requests can include public wallet and chain identifiers needed for the requested feature.

Do not reuse any RPC credential that has appeared in a public commit. A previous provider credential was removed from the current source, but repository history is unchanged; rotate it with the provider if it was yours.

## Checks

```sh
npm test
cargo test --manifest-path programs/space-ledger/Cargo.toml
cargo build-sbf --manifest-path programs/space-ledger/Cargo.toml
```

The JavaScript tests cover API responses, block-label conversion, quote math, Pyth account validation, receipt owner/discriminator/PDA validation, and browser-script syntax. The Rust unit test covers fixed-point curve and SOL conversion math. Automated tests do not contact Devnet and do not sign or send transactions. These checks are not a security audit.

## Not enabled

- Mainnet payments and any use of real funds.
- Swaps, secondary-market transfers/resales, NFTs, vesting, and yield. There is no sell instruction, order book, liquidity pool, or Jupiter route.
- TradingView candlesticks or other secondary-market price charts. The sale-activity page shows the primary-sale model and real confirmed receipts instead; it does not treat model estimates as traded prices.
- Token creation/hosting/trading, regional leaderboards, and GPS-based features.
- Other purchase tokens beyond Devnet SOL and the specified Devnet USDC mint.
- An external archival indexer; current portfolio reads scan program receipts from Solana RPC.

## Privacy, rights, and accessibility status

- Privacy, terms, and cookie pages are available under `public/pages/`. They are drafts, not a global compliance certification. The operator still needs to provide a legal name, service address, privacy contact, and deployment-specific hosting/RPC retention details before public launch.
- The current repository code does not set cookies, use browser storage, or load analytics/tracking scripts, and it contains no third-party iframe embeds. The deployed host and any later integrations must be checked separately. Add consent controls before enabling non-essential device storage/tracking where applicable law requires prior consent.
- Logo authorship/licensing is not recorded and must be verified before redistribution. The bundled Solana web3 library carries its own MIT notice; the repository code uses the MIT license.
- Accessibility improvements include visible keyboard focus, reduced-motion handling, accessible wallet dialog and grid controls, responsive navigation, and improved contrast. This is not a WCAG conformance claim; comprehensive screen-reader, zoom/reflow, device, and contrast testing remains on the roadmap.

## Planned work

See [ROADMAP.md](ROADMAP.md) for the staged TODO list, including the requested block-detail views and the reviews required before regional or token-market features.

Vercel deploys from the connected Git repository when its production branch is updated. Confirm the production deployment and run the read-only API checks after publishing; visiting the site never runs code upgrades.

The Devnet flow is for testing wallet approvals and receipt settlement. It is not financial advice or a promise of investment returns.

## License

MIT. See [LICENSE](LICENSE).
