# Funding and Collaboration Opportunities

**Last checked:** 2026-11-03  
**Project:** Space Ledger · Alitiora Initiative · Kenya  
**Repository:** https://github.com/Alitiora-Initiative/Space-Ledger  
**Live Devnet beta:** https://space-ledger-alitiora.vercel.app/

> **Status note:** The project operator reports that the $1,000 USD-equivalent Solana Foundation application was submitted on 2026-11-03. No award or disbursement is confirmed. This page records other opportunities and outreach plans; it does not claim that any external application has been submitted or that any partnership has been agreed.

## Funding targets

### Priority 1 — The Graph Grants: open general application

**Fit:** Strongest technical fit for a focused data-services proposal. The Graph's grant programme lists protocol, tooling, data services and community work, and states that grants go to individuals, projects and open-source initiatives. Its grants page currently has a general application link but says there are no open RFPs at the time this was checked.

- Programme: https://thegraph.com/grants/
- Application form: https://thegraph.typeform.com/applynow
- Solana Devnet support: https://thegraph.com/docs/en/supported-networks/solana-devnet/
- Substreams overview: https://docs.substreams.dev/

The Graph documents Solana Devnet indexing through Substreams. Substreams modules are written in Rust and can process Solana blocks, transactions and instructions. This makes a reusable Space Ledger receipt/event indexer a plausible ecosystem contribution.

**Important:** This is an open general intake, not an advertised grant with a known cheque size or an open RFP. Confirm eligibility, the requested amount, review expectations and payout method directly with the programme. Do not assume payment can be made in SOL or USDC until the grant team confirms it in writing.

#### Draft application concept

**Working title:** Open-source Solana Devnet Receipt Indexer and Verifiable History API for Space Ledger

**Category:** Data Services / Tooling

**Project summary:**

Space Ledger is an MIT-licensed Solana Devnet application built around whole-block purchases, an Anchor program, on-chain purchase receipts and a linear bonding curve. The current program emits a `PurchaseSettled` event and stores purchase details in receipt accounts. The application already has transaction/receipt lookup paths, but its historical data layer is limited.

I propose building and publishing a reusable Rust Substreams package for the Space Ledger Devnet program. The package will extract confirmed purchase events and normalize the data into a documented, reusable schema containing transaction signature, slot, block/time information where available, buyer, starting block, block count, payment asset, paid units, curve price and fee. A small consumer/API integration will use this verified data to power historical supply and purchase visualisations in Space Ledger.

The package and integration documentation will be MIT-licensed and publicly available so other Solana developers can study or adapt the approach to index Anchor program events and receipts. The system will never manufacture chart points or present model estimates as trades. If there is not enough confirmed history, the UI will show an empty or unavailable state.

The initial scope is limited to Solana Devnet. It does not include migrating the canvas application to Mainnet, launching a token, providing liquidity or building a speculative trading product.

**Why this benefits The Graph:**

- Provides a concrete Solana Devnet Substreams example based on a real Anchor program and emitted events.
- Produces an open-source data package and a documented consumer workflow.
- Demonstrates how indexed on-chain activity can support verifiable application history and analytics.
- Can be reused or adapted by other Solana developers.

**Proposed amount:** USD $1,000 equivalent (subject to programme fit and its budget rules). Ask whether milestone payments can be made in USDC or another supported digital asset before accepting an award.

**Proposed milestones:**

1. **$350 — Substreams package and event verification.** Build the initial Rust module; decode and normalize the program's confirmed purchase events; test it against known Devnet transactions and receipt accounts; publish a sample dataset and reproducible test instructions.
2. **$400 — Consumer API and historical visualisation.** Integrate the indexed output into a small API and application history view; test event ordering, duplicate handling, missing history, pagination and RPC/provider failures; ensure every displayed point links back to source evidence.
3. **$250 — Open-source release and reuse documentation.** Publish the package, schema, integration example, setup guide and a short technical report; invite external developer review and document any real third-party reuse or feedback. Do not claim adoption unless it occurs.

**Execution and skills disclosure:**

The project is independently maintained by Joseph Mushelle Nyingeh in Kenya. The existing application has a working Devnet prototype, Anchor/Rust program source, Node.js backend, automated tests and public documentation. Development is AI-assisted and incremental. The proposal should explicitly request technical review or mentorship for Substreams-specific Rust work where appropriate; it must not imply that a larger engineering team or prior Substreams integration already exists.

### Priority 2 — Superteam Earn Agentic Engineering Grant (watchlist; currently paused)

- Listing: https://superteam.fun/earn/grants/agentic-engineering/
- Listed amount: 200 USDG.
- Listed geography: Global.
- Purpose: cover one month of an AI coding-tool subscription for a builder shipping a working Solana product.
- Payment description on the listing: 50% upfront after KYC and 50% after shipping, with the second tranche requiring the product URL, GitHub repo and qualifying subscription receipt(s).

**Current status when checked:** Applications Paused. Do not treat the listing as open or attempt to apply until the status changes.

This is a particularly relevant fit because Space Ledger is already a working Solana Devnet prototype and is developed with AI-assisted tooling. It is not unrestricted operating capital: the listing ties the grant to a coding subscription and asks for receipts. Ask Superteam to confirm whether a future round is open to a Kenya-based individual and whether USDG payout is supported for the applicant's wallet.

Questions: support@superteam.fun.

### Priority 3 — Solana Mobile Builder Grants (future fit after an Android prototype)

- Programme: https://solanamobile.com/grants
- Application link is provided on the official page.
- The programme welcomes individuals, teams and organisations.
- Its current evaluation criteria require a mobile-first Android dApp and core Solana Mobile Stack integration, including Mobile Wallet Adapter (MWA) and Seed Vault.

This is not yet a strong application for the current web-first beta. Revisit after a genuine Android-first Space Ledger client demonstrates MWA/Seed Vault integration, mobile UX and a small tested feature set. Do not claim that the existing Phantom/Solflare in-app-browser path is native Solana Mobile Stack integration. Confirm funding amount and crypto payout options with the programme.

### Lower priority — Tether Grants and Bounties

- Programme: https://tether.dev/grants/bounties/

Tether advertises grants and bounties paid in USD₮ or sats and accepts work across decentralised systems, AI, P2P, cryptography, tooling and integrations. The currently listed technical bounties checked for this roadmap were focused on CoreML/Swift and Wireshark/networking tasks, rather than Space Ledger's current Solana canvas work. Do not apply to an unrelated bounty. Consider a general grant inquiry only after identifying a concrete integration with Tether's open technology stack and confirming that the work is within the programme's scope.

### Not currently a target

- The Solana Foundation application has already been submitted; do not submit a duplicate application unless the Foundation requests it.
- Superteam regional grants restricted to the United States, India, Nigeria or other named countries are not eligible for a Kenya-based applicant unless the listing explicitly allows applicants outside that region.
- The Graph currently has no open RFPs, although its general grant application link remains published.
- Do not treat expired or paused grants as available funding.

## Collaboration shortlist

These are technical collaborators to approach for feedback, knowledge-sharing or a narrowly scoped integration discussion. They are not confirmed partners, sponsors or funders.

### 1. Pxlcanvas — closest product peer

- Project: https://www.pxlcanvas.fun/
- GitHub organisation: https://github.com/pxlcanvas
- Smart-contract repository: https://github.com/pxlcanvas/canvas
- Public X account: https://x.com/pxlcanvasfun

Pxlcanvas is a Solana-based collaborative pixel canvas. Its public materials describe a 500×500 grid, token-burn-to-paint mechanics and on-chain pixel storage. Space Ledger has a different model: 10 billion blocks with 100 pixel positions per block, whole-block purchases, purchase receipts and a linear bonding curve.

**Approach:** Start as a peer-to-peer builder conversation, not a request for money. Ask to compare grid storage, batching, receipt indexing and approaches to truthful on-chain history. Offer a short call or a small public technical note comparing the two architectures. Acknowledge that the projects overlap and avoid claiming that either project is superior.

### 2. The Graph / StreamingFast — indexing and data-service collaborator

- Grants: https://thegraph.com/grants/
- Solana Devnet documentation: https://thegraph.com/docs/en/supported-networks/solana-devnet/
- Substreams docs: https://docs.substreams.dev/

**Approach:** Ask for guidance on a small Substreams package that extracts Space Ledger's `PurchaseSettled` events and creates a reusable Devnet purchase-history dataset. This is the clearest collaboration path aligned with the proposed grant. Request review of the schema and event extraction before building a larger indexing stack.

### 3. Light Protocol / Helius — scalability and state-compression guidance

- Light Protocol: https://lightprotocol.com/
- Open-source repository: https://github.com/Lightprotocol/light-protocol
- Documentation: https://zkcompression.com/

Light builds ZK Compression infrastructure for Solana. Its public materials say the technology can reduce the cost of creating tokens and PDAs. Light has announced that it is joining Helius; its open-source tooling and documentation continue.

**Approach:** Ask whether compressed state is suitable for a later Space Ledger experiment involving large-scale ownership metadata. Request architecture guidance and cost/complexity trade-offs first. Do not commit to a paid RPC, an indexer or a Merkle-tree migration before proving that the existing receipt/account model is insufficient.

### 4. Metaplex — compressed block-receipt proof-of-concept

- Bubblegum V2 documentation: https://www.metaplex.com/docs/smart-contracts/bubblegum-v2
- Source repository: https://github.com/metaplex-foundation/mpl-bubblegum

Metaplex Bubblegum V2 creates compressed NFTs using Merkle-tree leaves. One possible future experiment is a compressed ownership certificate for a purchased block or a batch of blocks—not one NFT per pixel.

**Cautions:** Bubblegum V2 requires an RPC provider with the Metaplex DAS API for indexing/fetching. Its documentation states ecosystem compatibility is still being adopted, and wallet/marketplace read and transfer support varies. Treat this as a research prototype, not a committed production design or a promise of tradeable ownership.

## Contact order

1. **Pxlcanvas:** send a short message first. It is the closest product peer and can offer relevant architecture feedback.
2. **The Graph / StreamingFast:** send the technical concept and ask for a Substreams review; this is also the strongest next grant-aligned conversation.
3. **Light Protocol / Helius:** ask for a short architecture pointer on compression only after documenting the current storage limits.
4. **Metaplex:** request advice on whether a compressed block-level proof is suitable, with explicit acknowledgement that this is exploratory.

## Outreach message — Pxlcanvas

> Hi Pxlcanvas team — I'm Jolse, an independent builder from Kenya working on Space Ledger, an open-source Solana Devnet canvas: https://github.com/Alitiora-Initiative/Space-Ledger
>
> I came across your 500×500 on-chain pixel canvas and thought it would be useful to connect with another team exploring collaborative canvas experiences on Solana. Space Ledger takes a different approach: 10 billion blocks with 100 positions per block, whole-block purchases, Anchor purchase receipts and a linear bonding curve.
>
> Would you be open to exchanging notes on grid storage, transaction batching and indexing verified canvas activity? I'd be happy to share what we've learned from our Devnet prototype and explore a small technical collaboration if there's a useful overlap.
>
> No funding request — I'd mainly value a technical conversation and the chance to learn from your implementation.

## Outreach message — The Graph / StreamingFast

> Hello The Graph team — I'm an independent builder in Kenya developing Space Ledger, an MIT-licensed Solana Devnet application with an Anchor program that emits a `PurchaseSettled` event and stores on-chain purchase receipts.
>
> I'm exploring an open-source Rust Substreams package for Solana Devnet that extracts and normalizes these events into verifiable purchase-history data, with a small consumer API and history visualisation. I saw that The Graph documents Solana Devnet support through Substreams.
>
> Would someone from the Substreams/data-services team be willing to review the proposed event schema or point me to the best starting template? I am also preparing a grant proposal around this reusable data-service contribution. The current source code and roadmap are public: https://github.com/Alitiora-Initiative/Space-Ledger

## DoraHacks: publish Space Ledger as a Build

DoraHacks describes Builds as project pages that showcase a project's introduction, past milestones, future roadmap, demo and external links. It also describes direct messaging between interested parties and Build owners.

- Create/manage Builds: https://dorahacks.io/build

Before contacting owners on DoraHacks, publish a Space Ledger Build with:
- A concise description of the working Devnet product.
- The live application and GitHub repository.
- A short demo video showing wallet connection, a Devnet quote, transaction approval and a verified receipt (use only a real test transaction).
- Current implemented capabilities versus planned features.
- A collaboration request focused on indexing, compression, UX or independent testing.

## Rules for funding and partnership outreach

- Never say a grant has been awarded, paid or approved until it has.
- Never claim any listed project is a Space Ledger partner until there is written agreement and a real collaboration.
- Never invent independent users, transactions, test results, testimonials or adoption metrics.
- Do not share wallet seed phrases, private keys, wallet JSON files or provider API keys.
- Share a public wallet address only when the programme asks for a payout address. Prefer one applicant-controlled wallet and confirm the requested network and token before providing it.
- Confirm whether a programme pays in USDC, SOL, USDG, USDT, GRT or another asset; do not assume a stablecoin ticker implies a particular network.
- Do not pay application, activation, unlock or release fees to an individual promising a grant. Verify any fee directly through the programme's official website.
- Keep all Space Ledger canvas development and testing on Devnet. The separate $SL Mainnet token is not part of these applications or collaboration claims.

