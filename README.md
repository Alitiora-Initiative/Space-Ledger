# Space Ledger

Space Ledger is a shared digital canvas made of 10 billion numbered blocks, each containing 100 pixels. Visitors can explore the grid, connect a Solana wallet, and test block purchases settled on Solana Devnet.

The concept takes inspiration from [The Million Dollar Homepage](https://www.webdesignmuseum.org/web-design-history/million-dollar-homepage-2005), Alex Tew's pixel advertising page launched in **2005**. Space Ledger is an independent project and is not affiliated with it.

## 🤖 GILGA PRIME Agent System

Space Ledger now features the **GILGA PRIME Agent System** - an autonomous agent orchestration framework that works to prepare the application for mainnet deployment.

### Core Agents
- **Gilga Prime (001)**: Root Architect - Project orchestration and coordination
- **Survivor (002)**: Implementation Agent - Fixes blockers and implements changes
- **Contradictor (003)**: Risk Assessment Agent - Challenges assumptions and exposes risks
- **Judge (004)**: Decision Agent - Enforces release criteria and quality gates

### Features
- Real-time agent monitoring via API endpoints
- 10-stage decision protocol for all changes
- Evidence-based decision making
- Automatic security and legitimacy enforcement
- Project record tracking and audit trail

### Agent API
- `GET /api/agents/registry` - View all agents
- `POST /api/agents/first-mission` - Trigger Gilga Prime's initialization
- `POST /api/agents/decision-protocol` - Execute full decision protocol
- `POST /api/agents/challenge` - Have Contradictor challenge a proposal
- See `.devin/agents/README.md` for full API documentation

## 🌈 Visual Features

### Celestial Theme
- Rainbow-colored celestial background with 200 animated stars
- 7 rotating nebulas (one for each rainbow color)
- Dynamic cosmic atmosphere across all pages

### 3D Agent Visualization
- 7 rainbow-colored 3D agents (Among Us style) moving in real-time
- Agents display their state (idle, working, moving) through animations
- Hand waving, visor blinking, and glow effects
- Powered by Three.js for smooth 4K-quality rendering

## What is live on Devnet

- Phantom wallet purchase approvals for Devnet SOL and the Devnet USDC mint.
- An Anchor Solana program that accepts payment, records a purchase receipt, and advances the sold-block supply atomically.
- SOL-to-USD conversion checked on-chain against Pyth's fully verified SOL/USD price feed. Quotes reject stale or low-confidence prices.
- A fixed receiving wallet, `EDZjEbRAtqyC8z6ta6PYHX161Xynt13tWpd7orKERkbz`, for purchase proceeds.
- Receipt-based ownership lookups, a live supply count, and wallet portfolio display.
- Compact labels such as `000A`–`999A`, then `000B`–`999B`, continuing through `Z`, `AA`, and onward. Numeric block numbers are canonical.

The program is deployed at `EbP7vsnMXPonTfriPUFynco69d69JiXpWbKnwVmz8sgG` on Devnet. Its upgrade authority is the receiving wallet above. The app is pinned to Devnet; changing an environment variable cannot switch it to mainnet.

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

The application now uses RPCfast Devnet endpoints for improved performance and reliability.

## Checks

```sh
npm test
cargo test --manifest-path programs/space-ledger/Cargo.toml
cargo build-sbf --manifest-path programs/space-ledger/Cargo.toml
```

The JavaScript tests cover API responses, block-label conversion, quote math, Pyth account validation, and browser-script syntax. The Rust unit test covers fixed-point curve and SOL conversion math. A separate Devnet smoke transaction has verified deployment, payment, supply advancement, and a purchase receipt. These checks are not a security audit.

## Not enabled

- Mainnet payments and any use of real funds.
- Swaps, secondary-market transfers/resales, NFTs, vesting, and yield.
- Other purchase tokens beyond Devnet SOL and the specified Devnet USDC mint.
- An external archival indexer; current portfolio reads scan program receipts from Solana RPC.

The Devnet flow is for testing wallet approvals and receipt settlement. It is not financial advice or a promise of investment returns.

## License

MIT. See [LICENSE](LICENSE).
