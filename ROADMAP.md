# Space Ledger TODO

This is a planning document, not a promise that work runs automatically. The website does not improve itself when visited. Changes need an owner, review, tests, and an intentional deployment.

## Beta work completed

- [x] Read-only Devnet supply and purchase statistics.
- [x] Top-holder ranking derived from validated purchase receipts; ranks original buyers because transfers are not implemented.
- [x] Profile purchase history from confirmed on-chain receipts.
- [x] Simulate unsigned purchase transactions before requesting a wallet signature.
- [x] Persistent legal footer, responsive navigation, local system typography, and site icon.
- [x] Market activity view that separates the primary-sale model from unavailable secondary-market trading data.

## Remaining beta gates

- [ ] Test signed purchases on Devnet with an explicitly approved wallet transaction and record the transaction receipt.
- [ ] Add Wallet Standard discovery and mobile wallet support; the current purchase flow supports Phantom's injected Solana provider.
- [ ] Preserve transaction signatures in receipts or add a verified indexer if a true transaction history is needed.
- [ ] Resolve operator identity/contact fields and provider retention details in the privacy, terms, and cookie notices.
- [ ] Complete responsive visual, keyboard, screen-reader, and WCAG contrast checks on real mobile and desktop browsers.
- [ ] Obtain an independent program/security review before any public beta beyond test-only Devnet use.

## Before public launch

- [ ] Add the operator's verified legal name, service address, and privacy contact to the notices.
- [ ] Identify the Vercel hosting, RPC, wallet, and security providers; document their processing, logs, retention, and any cross-border transfers.
- [ ] Confirm the creator and redistribution rights for `public/img/logo.jpg`; record attribution and third-party notices.
- [ ] Review applicable Kenya and target-country privacy, consumer, accessibility, financial, and online-service requirements with qualified counsel.
- [ ] Audit the deployed site, response headers, dependencies, external requests, and any platform-added cookies/storage before launch.
- [ ] Complete keyboard, screen-reader, zoom/reflow, reduced-motion, forced-colors, and contrast testing against WCAG 2.2; fix any remaining issues and record results.

## Block exploration

- [ ] Define a clear, keyboard-accessible block detail interaction: a block/cube overview plus a pixel-cluster view, with one activation path that also works for touch and assistive technology.
- [ ] Show ownership only from verified on-chain receipts. For large owners, paginate or aggregate results and avoid exposing unnecessary personal data.
- [ ] Add tests for block selection, view changes, ownership loading/error/unknown states, and responsive layout before enabling the UI.

## Regional discovery

- [ ] Define what “region” means and whether users can choose it manually; do not request precise GPS by default.
- [ ] Complete a privacy impact and abuse review before showing regional rankings or connecting location to wallet addresses.
- [ ] Use transparent aggregation, minimum group sizes, opt-in controls, deletion/retention rules, and an accessible non-map alternative.

## Token-market concept (not enabled)

- [ ] Do not launch tokens or enable trading in this prototype. First obtain legal and security review for each supported jurisdiction and define age/eligibility, issuer identity, disclosures, custody, market-abuse, tax, sanctions, consumer-protection, and incident-handling requirements.
- [ ] Evaluate whether a third-party chart integration is necessary; document its data sharing and licensing before embedding anything.
- [ ] If ever approved, start with read-only data on Devnet and clearly label it. Do not display simulated prices, owners, trades, or activity as real.

## Delivery

- [ ] Run `npm test` for every change and add focused browser/accessibility checks for interactive UI.
- [ ] Review the diff and deployment preview before merging or publishing.
- [ ] Verify the target repository and Vercel deployment after delivery; never force-push over remote work.
