# Space Ledger

Space Ledger is a shared digital canvas made of 10 billion numbered blocks, each containing 100 pixels. Visitors can explore the grid, connect a Solana wallet, and test block purchases settled on Solana Devnet.

The concept takes inspiration from [The Million Dollar Homepage](https://www.webdesignmuseum.org/web-design-history/million-dollar-homepage-2005), Alex Tew's pixel advertising page launched in **2005**. Space Ledger is an independent project and is not affiliated with it.

## App pages

- **Home** (`/`): project overview, supply and pricing summary, and links to the main tools.
- **Pricing** (`/pages/purchase.html`): quotes and wallet-approved Devnet purchase flow.
- **Grid** (`/pages/grid.html`): browse numbered blocks.
- **Treasury**, **Network**, **Dashboard**, and **Profile**: project status, network configuration, and wallet views.
- **Privacy**, **Terms**, and **Cookies**: notices under `/pages/`; these remain drafts until the operator identity and contact details are confirmed.

The product name shown in the interface is **Space Ledger**. The app does not run autonomous agents or upgrade itself when visited.

## Devnet implementation

This repository contains a Devnet-only purchase and ownership implementation. Whether it is configured and currently functioning depends on deployment settings and live network state; this audit did not perform a Devnet transaction.

- Phantom wallet purchase approvals for Devnet SOL and the Devnet USDC mint.
- An Anchor Solana program that accepts payment, records a purchase receipt, and advances the sold-block supply atomically.
- SOL-to-USD conversion checked on-chain against a configured Pyth SOL/USD feed. The program checks feed identity, confidence, and freshness.
- A fixed receiving wallet, `EDZjEbRAtqyC8z6ta6PYHX161Xynt13tWpd7orKERkbz`, for purchase proceeds.
- Receipt-based ownership lookups, a live supply count, and wallet portfolio display.
- Compact labels such as `000A`–`999A`, then `000B`–`999B`, continuing through `Z`, `AA`, and onward. Numeric block numbers are canonical.

The configured program ID is `EbP7vsnMXPonTfriPUFynco69d69JiXpWbKnwVmz8sgG`; its current Devnet state and upgrade authority were not independently verified in this audit. The app is pinned to Devnet; changing an environment variable cannot switch it to mainnet.

The displayed curve starts at $0.001 per block and rises linearly toward $1,000. A $0.10 protocol fee is added to each purchase. Network transaction fees and any rent for new on-chain accounts are separate. Devnet tokens have no real-world value.

## Try a purchase

1. Install Phantom and switch its network to **Devnet**.
2. Fund the connected wallet with Devnet SOL using the [Solana faucet](https://faucet.solana.com/). For USDC purchases, obtain tokens for the Devnet USDC mint `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` from a Devnet token faucet.
3. Open Pricing, select SOL or USDC, enter a budget, and request a quote.
4. Review the network and payment amounts in Phantom, then approve the transaction. The app records ownership only after the confirmed on-chain receipt is found.
5. Open Profile with the same wallet connected to see its verified purchase ranges.

Block labels are a convenience for entering positions; the purchase screen's quote determines the contiguous range available at the current supply. A receipt records the original buyer and range. Transfer/resale support is not implemented, so do not treat receipts as transferable NFTs.

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

The JavaScript tests cover selected API responses, block-label conversion, quote math, Pyth account validation, and browser-script syntax. The Rust unit test covers fixed-point curve and SOL conversion math. Automated tests do not contact Devnet, and no live smoke transaction was performed during this audit. These checks are not a security audit.

## Not enabled

- Mainnet payments and any use of real funds.
- Swaps, secondary-market transfers/resales, NFTs, vesting, and yield.
- Token creation/hosting/trading, regional leaderboards, and GPS-based features.
- Other purchase tokens beyond Devnet SOL and the specified Devnet USDC mint.
- An external archival indexer; current portfolio reads scan program receipts from Solana RPC.

## Privacy, rights, and accessibility status

- Privacy, terms, and cookie pages are available under `public/pages/`. They are drafts, not a global compliance certification. The operator still needs to provide a legal name, service address, privacy contact, and deployment-specific hosting/RPC retention details before public launch.
- The current repository code does not set cookies, use browser storage, or load analytics/tracking scripts, and it contains no third-party iframe embeds. The deployed host and any later integrations must be checked separately. Add consent controls before enabling non-essential device storage/tracking where applicable law requires prior consent.
- Logo authorship/licensing is not recorded and must be verified before redistribution. The bundled Solana web3 library carries its own MIT notice; the repository code uses the MIT license.
- Accessibility improvements include keyboard focus visibility, a skip link, reduced-motion handling, accessible wallet dialog and grid controls, and higher-contrast muted text. This is not a WCAG conformance claim; see `ROADMAP.md` for remaining checks.

## Planned work

See [ROADMAP.md](ROADMAP.md) for the staged TODO list, including the requested block-detail views and the reviews required before regional or token-market features.

Vercel can deploy an Express app from a connected Git repository. To publish a reviewed change, push it to the branch configured as the Vercel production branch; this workspace cannot verify that branch setting or trigger a deployment directly. Visiting the site never runs code upgrades.

The Devnet flow is for testing wallet approvals and receipt settlement. It is not financial advice or a promise of investment returns.

## License

MIT. See [LICENSE](LICENSE).
