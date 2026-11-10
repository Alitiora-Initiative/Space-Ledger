# Collaboration and Outreach

**Project:** Space Ledger · Alitiora Initiative · Kenya  
**Repository:** https://github.com/Alitiora-Initiative/Space-Ledger  
**Live Devnet beta:** https://space-ledger-alitiora.vercel.app/

> These are potential technical contacts, not confirmed partners, sponsors or funders. No partnership is claimed. Outreach should be exploratory and focused on feedback or knowledge-sharing.

## Collaboration shortlist

### 1. Pxlcanvas — closest product peer

- Project: https://www.pxlcanvas.fun/
- GitHub organisation: https://github.com/pxlcanvas
- Smart-contract repository: https://github.com/pxlcanvas/canvas
- Public X account: https://x.com/pxlcanvasfun

Pxlcanvas is a Solana-based collaborative pixel canvas. Its public materials describe a 500×500 grid, token-burn-to-paint mechanics and on-chain pixel storage. Space Ledger has a different model: 10 billion blocks with 100 pixel positions per block, whole-block purchases, purchase receipts and a linear bonding curve.

**Suggested conversation:** Compare grid storage, transaction batching, receipt indexing and approaches to showing verified on-chain activity. Acknowledge the projects' overlap and avoid claiming that either project is superior.

### 2. The Graph / StreamingFast — indexing and data-service guidance

- Solana Devnet documentation: https://thegraph.com/docs/en/supported-networks/solana-devnet/
- Substreams documentation: https://docs.substreams.dev/

**Suggested conversation:** Ask for guidance on a small Substreams package that extracts Space Ledger's `PurchaseSettled` events and creates a reusable Devnet purchase-history dataset. Request feedback on the event schema and an appropriate starting template before committing to a larger indexing stack. This is a technical collaboration inquiry, not a funding application.

### 3. Light Protocol / Helius — scalability and state-compression guidance

- Light Protocol: https://lightprotocol.com/
- Open-source repository: https://github.com/Lightprotocol/light-protocol
- Documentation: https://zkcompression.com/

Light builds ZK Compression infrastructure for Solana.

**Suggested conversation:** Ask whether compressed state could suit a later Space Ledger experiment involving large-scale ownership metadata. Request architecture guidance and cost/complexity trade-offs first. Do not commit to a paid RPC, indexer or Merkle-tree migration before proving that the existing receipt/account model is insufficient.

### 4. Metaplex — compressed block-receipt proof of concept

- Bubblegum V2 documentation: https://www.metaplex.com/docs/smart-contracts/bubblegum-v2
- Source repository: https://github.com/metaplex-foundation/mpl-bubblegum

One possible future experiment is a compressed ownership certificate for a purchased block or a batch of blocks—not one NFT per pixel.

**Cautions:** Treat this as research, not a committed production design. Check current DAS indexing requirements and wallet/marketplace support before implementing anything.

## Suggested contact order

1. **Pxlcanvas:** begin with a peer-to-peer builder conversation about canvas architecture.
2. **The Graph / StreamingFast:** ask for technical guidance on indexing verified Devnet purchase events.
3. **Light Protocol / Helius:** seek an architecture pointer on compression after documenting current storage limits.
4. **Metaplex:** ask whether a compressed block-level proof is suitable, making clear that the idea is exploratory.

## Outreach message — Pxlcanvas

> Hi Pxlcanvas team — I'm Jolse, an independent builder from Kenya working on Space Ledger, an open-source Solana Devnet canvas: https://github.com/Alitiora-Initiative/Space-Ledger
>
> I came across your on-chain pixel canvas and thought it would be useful to connect with another team exploring collaborative canvas experiences on Solana. Space Ledger takes a different approach: 10 billion blocks with 100 positions per block, whole-block purchases, Anchor purchase receipts and a linear bonding curve.
>
> Would you be open to exchanging notes on grid storage, transaction batching and indexing verified canvas activity? I'd be happy to share what we've learned from our Devnet prototype and explore a small technical collaboration if there's useful overlap.
>
> No funding request — I'd mainly value a technical conversation and the chance to learn from your implementation.

## Outreach message — The Graph / StreamingFast

> Hello The Graph team — I'm an independent builder in Kenya developing Space Ledger, an MIT-licensed Solana Devnet application with an Anchor program that emits a `PurchaseSettled` event and stores on-chain purchase receipts.
>
> I'm exploring an open-source Rust Substreams package for Solana Devnet that extracts and normalizes these events into verifiable purchase-history data, with a small consumer API and history visualisation. I saw that The Graph documents Solana Devnet support through Substreams.
>
> Would someone from the Substreams/data-services team be willing to review the proposed event schema or point me to the best starting template? The current source code and roadmap are public: https://github.com/Alitiora-Initiative/Space-Ledger

## DoraHacks: publish Space Ledger as a Build

DoraHacks Builds can showcase a project's introduction, milestones, roadmap, demo and external links.

- Create/manage Builds: https://dorahacks.io/build

A useful Space Ledger Build should include:
- A concise description of the working Devnet product.
- The live application and GitHub repository.
- A short demo showing wallet connection, a Devnet quote, transaction approval and a verified receipt. Use only a real test transaction.
- A clear distinction between implemented features and planned work.
- A collaboration request focused on indexing, compression, UX or independent testing.

## Outreach safeguards

- Do not describe any project as a Space Ledger partner until there is written agreement and a real collaboration.
- Do not claim that exploratory integrations are implemented.
- Do not invent independent users, transactions, test results, testimonials or adoption metrics.
- Keep canvas development and testing on Devnet. The separate external token Mainnet token is not part of the Devnet canvas application.
- Never share seed phrases, private keys, wallet JSON files or provider API keys.
