# Space Ledger

Space Ledger is a visual prototype for a shared canvas of 1 trillion pixels, arranged as 10 billion blocks of 100 pixels. Its published linear price formula is available as a read-only estimate. Purchases, ownership, treasury vesting, and resales are deliberately disabled until a production ownership program and verified indexer are deployed.

The concept draws inspiration from [The Million Dollar Homepage](https://www.webdesignmuseum.org/web-design-history/million-dollar-homepage-2005), launched by Alex Tew in **2005**. Space Ledger is an independent project and is not affiliated with the original.

## Current features

- Responsive static pages with a high-DPI animated galaxy canvas and a persistent navigation bar.
- Phantom and MetaMask wallet identity connections. The app does not request signatures or send wallet transactions.
- A read-only estimator for the proposed bonding curve and a grid preview whose ownership state is explicitly unverified.
- Compact block labels: `000A`–`999A`, then `000B`–`999B`, continuing through `Z`, `AA`, and onward. Numeric IDs remain the canonical on-chain positions.
- A fixed-list public EVM RPC explorer. It accepts allowlisted read-only methods and rejects transaction methods.
- An Express server for static pages, estimate endpoints, and deployment-status responses.

## Run locally

Requirements: Node.js 22 or later.

```sh
npm install
copy .env.example .env
npm start
```

Open [http://localhost:3000](http://localhost:3000). On macOS or Linux, use `cp .env.example .env` instead of `copy`.

`FEE_WALLET_ADDRESS` is the public receiving address supplied by the project owner. It is configuration for future settlement work; the current app does not route payments to it. Never put private keys in the repository or browser.

## Checks

```sh
npm test
npm run compile
```

The tests cover static pages, read-only API responses, and JavaScript syntax. `npm run compile` compiles the draft Solidity contract. A successful compile does not mean that the contract has been deployed, audited, or connected to the website.

## Not live yet

- No ownership contract or Solana program is deployed. The Solidity source is an unconnected draft and does not implement a Solana program.
- Purchase and resale APIs return HTTP 503. The app does not accept a payment transaction signature or claim ownership after a wallet transfer.
- Holdings, activity, supply sold, fees collected, and vesting progress are not reported as live data.
- The configured wallet address does not by itself enable payment collection or settlement.
- Pricing and treasury parameters describe a model, not a quote, asset, or promise of returns.

## License

MIT. See [LICENSE](LICENSE).
