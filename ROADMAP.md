# Space Ledger Roadmap

This is a human-maintained checklist. The website does not create agents, edit its source, or deploy upgrades when someone visits. Each release requires a reviewed change and a deliberate deployment.

## Done in This Update

- [x] Connect the app's wallet chooser and purchase path to dynamic Wallet Standard discovery; require Solana Devnet and legacy `signAndSendTransaction` support.
- [x] Use generic wallet labels and user-controlled approval; retain Devnet transaction simulation before signing.
- [x] Add deterministic wallet-registry/connect/sign tests.
- [x] Remove disconnected EVM vesting/ownership code and old $10/PnL demos that contradicted the active $1,000 curve.
- [x] Remove the unconnected Supabase schema, which was not used by the app and advertised public access to wallet records.
- [x] Remove placeholder release artifacts and unused config, vesting, genesis, and stream routes.
- [x] Refresh README/API documentation and prepare a detailed GitHub Wiki guide.

## Beta Release Gates

- [ ] Verify the GitHub Wiki page, production deployment, configured environment variables, and live API responses after publishing.
- [ ] Complete an explicitly approved test purchase on Solana Devnet, then verify the transaction and receipt in Solana Explorer. Never request or send a wallet transaction without the user's explicit approval.
- [ ] Add transaction signatures to receipts or build a verified indexer that joins signatures to program receipts.
- [ ] Review the official MetaMask Connect Solana package license and obtain any needed commercial permission before deciding whether to bundle it; then test the SDK and mobile flow. Do not claim MetaMask support before then.
- [ ] Test mobile wallet support. Wallet Standard discovery currently sees wallets exposed in the active browser; it does not implement QR, WalletConnect, or app handoff.
- [ ] Complete responsive browser testing, keyboard-only use, screen-reader checks, zoom/reflow, forced-colors, reduced-motion, image-alt review, and measured contrast testing.
- [ ] Review the Solana program, transaction construction, rate limits, RPC behavior, dependency health, and recovery process with independent reviewers before any public beta.

## Privacy, Rights, and Legal Readiness

- [ ] Add the operator's verified legal name, postal contact, and privacy contact to the legal pages.
- [ ] Document the actual Vercel, RPC, and wallet-provider processing, log retention, service regions, and cross-border transfers.
- [ ] Recheck the deployed domain for cookies, storage, embeds, and network requests; add consent controls before introducing any non-essential tracking or device storage where required.
- [ ] Confirm the creator and redistribution rights for `public/img/logo.jpg`; retain third-party license notices for dependencies.
- [ ] Obtain qualified review for Kenya and every intended target country before marketing or enabling real-value features. Current legal pages are drafts, not compliance certification.

## Scale and Product Features

- [ ] Build a receipt indexer with pagination and consistency checks before the on-chain account scan becomes a bottleneck.
- [ ] Define block-detail and pixel-cluster interactions with keyboard, touch, and assistive-technology paths. Show ownership only when it is verifiable from receipts.
- [ ] Keep trading, token issuance, transfers, region/GPS features, and third-party chart embeds disabled until their security, data, privacy, and legal requirements are reviewed.
- [ ] If a real secondary market is ever approved, display only executed, sourced trades. Never present the primary-sale model or fabricated candles as market activity.

## Delivery Checks

- [ ] Run `npm test`, `cargo test --manifest-path programs/space-ledger/Cargo.toml`, and `npm run compile` for relevant changes.
- [ ] Review the full diff and verify the target GitHub branch before pushing; never force-push.
- [ ] Confirm the Vercel deployment reaches Ready and test production pages and API routes after the Git push.
