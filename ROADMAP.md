# Space Ledger Roadmap

Human-maintained checklist. Deployments require a deliberate Git push (and Vercel rebuild).

## Done (Devnet beta)

- [x] Wallet Standard multi-wallet connect; Devnet-only purchase path; user must approve in wallet.
- [x] Linear bonding curve on-chain; each buy advances supply and raises next price.
- [x] Live Devnet purchases verified (program `EbP7vsnMXPonTfriPUFynco69d69JiXpWbKnwVmz8sgG`; supply and receipts readable via API).
- [x] Rate limits on quote / purchase / read APIs; short TTL cache on config.
- [x] Balance-aware quotes; insufficient-funds messaging; success toast + Explorer link.
- [x] Grid deep-link to buy **whole blocks**; profile/dashboard model PnL % and history links.
- [x] Operator contact on Privacy / Terms / Cookies: Joseph Mushelle Nyingeh · jaymnyon@gmail.com.
- [x] Logo: operator-generated (AI-assisted); claimed as project asset by operator (no third-party stock license).
- [x] Mobile testing path documented (`/pages/mobile.html`): Phantom/Solflare **in-app browser** on Devnet.
- [x] Basic a11y: focus-visible, reduced-motion, logo alt, touch targets (further audit optional).
- [x] Free-tier friendly: public Devnet RPC default; optional private RPC via `SOLANA_RPC_DEVNET` only on server.
- [x] Exposed `rpcProvider` host class (`public-devnet` / `helius-devnet`) on `GET /api/solana/config` without secrets.

## Active Architecture & Feature Scope (User Request 2026-11-01)

### 1. Efficient Grid & Block-Pixel Rendering
- **Goal**: Make rendering and state queries for 10 billion blocks / 100 pixels per block responsive on desktop and mobile without DOM thrashing or memory bloat.
- **Alternative A (Recommended - Virtualized WebGL / Canvas + Chunk API)**: 
  - Viewport-based LOD (Level of Detail) rendering using HTML5 2D Canvas or PixiJS.
  - Divide grid into spatial chunks (e.g. 64x64 blocks per chunk).
  - API endpoint `GET /api/grid/chunk?x=...&y=...` returning compact binary bitmasks/run-length encoded state of purchased blocks.
  - Zero simulated pixels: unpurchased blocks render procedural base texture; purchased blocks render confirmed receipt states.
- **Alternative B (Solana State Compression / Compressed NFTs - Bubblegum)**:
  - Mint pixel ownership records to concurrent Merkle trees on Solana.
  - Downside: Requires dedicated DAS indexer (Helius/Triton) to read state, which exceeds zero-cost free-tier default.
- **Acceptance check**: 60 FPS viewport panning/zooming; viewport memory <50MB; chunk fetch latency <100ms; zero fabricated pixels.

### 2. Two-Way Market: Buy and Sell Orders
- **Goal**: Allow users to both buy and sell blocks / positions, transforming the primary-only issuance into a continuous two-way market.
- **Alternative A (Recommended - On-Chain Two-Way Bonding Curve AMM)**:
  - Add `sell_blocks` instruction to Anchor program `programs/space-ledger/src/lib.rs`.
  - Selling burns the receipt account / returns blocks to pool, refunding Devnet SOL/USDC along the exact linear bonding curve formula minus a small fee.
  - Guaranteed instant execution without counterparty matching; preserves mathematical pricing invariant.
- **Alternative B (Decentralized Orderbook / OpenBook v2 on Devnet)**:
  - Deploy an orderbook market where users place discrete limit buy and sell orders.
  - Downside: Liquidity fragmentation and higher transaction compute/rent overhead for users on Devnet.
- **Acceptance check**: `cargo test` verifying both buy (supply advances, price rises) and sell (supply retreats, SOL refunded, receipt closed/burned); `simulated: false` across all market endpoints.

### 3. Real-Time Movement Charts (No Simulated Data)
- **Goal**: Visual chart displaying price and supply movement over time without synthetic or random data.
- **Alternative A (Recommended - Lightweight-Charts fed by Live On-Chain Event History)**:
  - Embed TradingView Lightweight Charts on `/pages/market.html` and `/pages/token.html`.
  - Feed real event timestamps and prices from Solana program transaction signatures (`/api/receipt/:address/signatures` and program event logs).
  - For $SL token: feed live Raydium/StonkFun OHLCV data from GeckoTerminal / DexScreener public APIs.
- **Alternative B (Server-Side Micro-Indexer)**:
  - SQLite/Postgres log of confirmed purchase/sell events queried by `/api/chart/history`.
- **Acceptance check**: Chart renders real time-series points; displays empty/awaiting state when no trades exist in range; 0 fake or simulated ticks.

## Phased Implementation Plan

- **Phase 1 (Design & Scope - Complete)**: Update `ROADMAP.md` and `README.md` with explicit architecture alternatives, constraints, and acceptance criteria.
- **Phase 2 (Grid Optimization)**: Virtualized canvas viewport prototype + chunk API.
- **Phase 3 (Live Movement Chart)**: TradingView Lightweight Charts integration with real transaction history API.
- **Phase 4 (Two-Way Bonding Curve)**: Anchor program `sell_blocks` instruction, unit tests (`cargo test`), and frontend sell UI.

## Still open (Backlog & Audits)

- [ ] Optional free Helius Devnet RPC in Vercel for better concurrency under Discord spikes.
- [ ] Persist tx signatures on-chain or in a dedicated indexer (UI already shows Explorer after buy).
- [ ] Full WCAG / screen-reader specialist pass (issue #7 remainder).
- [ ] WalletConnect QR / deep-link beyond in-app browser (issue #8 enhancement).
- [ ] Independent program security review before any mainnet or real-value marketing.
- [ ] Formal legal counsel for Kenya / target markets before mainnet.

## Explicitly out of scope until funded

- Mainnet migration, paid RPC/indexer, MetaMask Connect (license review first), fabricated market charts.
