# Space Ledger

> An experimental, blockchain-inspired pixel canvas with block pricing, wallet integrations, and a small Express API.

## About

Space Ledger models a shared canvas of **1 trillion pixels**, divided into **10 billion blocks** of 100 pixels each. Visitors can explore the grid, view a linear pricing model, and try wallet, portfolio, treasury, and network screens.

The project takes inspiration from [The Million Dollar Homepage](https://www.webdesignmuseum.org/web-design-history/million-dollar-homepage-2005), Alex Tew's pixel-advertising experiment launched in **2005**. Space Ledger reimagines the shared pixel grid as a blockchain-themed prototype; it is not affiliated with the original site. (The original launched in 2005, not 2009.)

## What is included

- Static pages for the canvas, block purchase demo, grid, dashboard, profile, swap, treasury, and network views.
- An Express server that serves the pages and exposes pricing, supply, grid, treasury, portfolio, and wallet-related API routes.
- A linear block-price model, Solana wallet/payment experiments, and an optional Supabase data adapter.
- An experimental Solidity contract in `contracts/`. It is not connected to the Express API or the website's current ownership flow.

## Run locally

Requirements: Node.js 22 or later.

```sh
npm install
copy .env.example .env
npm start
```

Open [http://localhost:3000](http://localhost:3000). On macOS or Linux, use `cp .env.example .env` instead of `copy`.

For a local demo, leave `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` blank. The example file contains placeholder values that must be replaced or cleared. To enable Supabase, configure both values in `.env` and run the SQL in [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor. Keep `.env` and the service-role key private; `.env` is ignored by Git.

`SOLANA_NETWORK` defaults to `devnet`. `FEE_WALLET_ADDRESS` is required for the browser's Solana payment experiment; without it, payment routing is disabled. Do not use a mainnet wallet or send real funds with this prototype.

## Checks

```sh
npm test
npm run compile
```

The test suite syntax-checks the JavaScript and inline page scripts, then starts the Express app and checks its read-only API and static pages. `npm run compile` compiles the Solidity contract with Hardhat.

## Prototype limitations

- The browser can submit a Solana transfer to the configured fee wallet, but the backend does not verify the submitted transaction signature before recording a purchase.
- The `/api/purchase` and `/api/swap` routes are prototype bookkeeping flows. A swap does not send funds back to the user.
- Ownership is currently represented by server memory or Supabase records. The Solidity contract is not wired into these flows, so the website does not currently prove ownership on-chain.
- Local server state is stored in `data/state.json` when a write route runs. Vercel's serverless filesystem is not durable; use a persistent database before relying on state in a deployment.
- The displayed pricing and the Solidity contract's constants are separate prototype models. Neither should be treated as a financial quote or promise of return.

## License

This project is licensed under the MIT License. See [`LICENSE`](LICENSE).
