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

## Still open (not required for Devnet demo)

- [ ] Optional free Helius Devnet RPC in Vercel for better concurrency under Discord spikes.
- [ ] Persist tx signatures on-chain or in a dedicated indexer (UI already shows Explorer after buy).
- [ ] Full WCAG / screen-reader specialist pass (issue #7 remainder).
- [ ] WalletConnect QR / deep-link beyond in-app browser (issue #8 enhancement).
- [ ] Pixel-level on-chain ownership (issue #10 — new program design).
- [ ] Secondary market / transfers (issue #11 — program + legal + audit).
- [ ] Independent program security review before any mainnet or real-value marketing.
- [ ] Formal legal counsel for Kenya / target markets before mainnet.

## Explicitly out of scope until funded

- Mainnet migration, paid RPC/indexer, MetaMask Connect (license review first), fabricated market charts.
