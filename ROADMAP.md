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

## Active Architecture & Feature Scope

This section describes the current implementation and the actual future protocol decisions. The measurable performance targets below are targets only until a reproducible benchmark is published.

### 1. Grid rendering and confirmed ownership queries

**Current state:** the application has a virtualized grid experience and `GET /api/grid/chunk` for bounded grid queries. The underlying sale/receipt model is still whole-block based. The 100 positions inside a block are not separately owned assets.

**Next work:**
- Keep viewport rendering and chunk queries bounded; measure rather than claim a fixed frame rate or latency.
- Use confirmed receipt-derived owner information; never generate random ownership or fake trades to fill the canvas.
- Publish benchmark method, viewport size, device/browser, data size, memory and measured results before claiming FPS, memory or latency targets.
- The current receipt API still queries Solana program accounts on demand. Track the durable indexer separately in [issue #20](https://github.com/Alitiora-Initiative/Space-Ledger/issues/20).

### 2. Pixel-level ownership — design first

**Current state:** not implemented. Each purchase receipt identifies a contiguous range of whole blocks. There are 100 theoretical pixel positions per block, but those positions do not currently have independent owners or transfer semantics.

**Options to benchmark before choosing:**
- **Packed bitmap/tile state:** represent 100 pixel occupancy/ownership slots in compact bounded state. Measure account rent, write contention, transaction size and query costs.
- **Tile PDAs:** partition pixel data into independently addressable bounded accounts. Measure rent, account count, write costs and account initialization.
- **Bubblegum V2 compressed assets:** Merkle-tree-backed cNFT leaves can scale asset records, but retrieval/proofs depend on an RPC provider with the Metaplex DAS API and a durable indexer.
- **Hybrid:** preserve whole-block primary-sale receipts and add a versioned pixel-claim layer only after migration and atomicity are specified.

Do not mint one ordinary account/NFT for every position in a theoretical trillion-pixel canvas. Do not say pixel ownership exists until the program records and verifies it.

Research and acceptance criteria: [issue #10](https://github.com/Alitiora-Initiative/Space-Ledger/issues/10), [Bubblegum V2](https://www.metaplex.com/docs/smart-contracts/bubblegum-v2), [DAS indexing model](https://www.metaplex.com/docs/smart-contracts/bubblegum-v2/stored-nft-data).

### 3. Transfers and secondary market — separate from curve redemption

**Current state:** not implemented. A purchase receipt is historical purchase evidence; it is not currently a transferable asset with an owner field that can be safely reassigned.

A future market must choose and implement an explicit asset/ownership model. Evaluate:
- escrowed listings with seller authorization, atomic buyer payment and ownership transfer;
- direct fixed-price listing/transfer with replay and double-fill protection;
- Bubblegum V2 `transferV2` only if the pixel/block asset model is built on compressed assets and DAS proofs can be obtained.

A curve buyback/redemption is not a peer-to-peer secondary market. Do not implement a simplistic `sell_blocks` instruction that decrements global supply and refunds funds without proving current ownership, preventing replay, and reconciling all supply/curve invariants.

Design, threat model, legal review and acceptance tests: [issue #11](https://github.com/Alitiora-Initiative/Space-Ledger/issues/11).

### 4. Verifiable time-series charts

Charts must be constructed from confirmed on-chain events/receipts for the Devnet canvas, or explicitly separate market-data APIs for the unrelated Mainnet external token token. Keep those datasets and labels separate. Display an empty, delayed or unavailable state when there are no verified points. Do not fabricate ticks, prices, volume or holder counts.

### 5. Delivery order

1. **Transaction reliability:** remove preflight error suppression and add signature recovery — [issue #22](https://github.com/Alitiora-Initiative/Space-Ledger/issues/22).
2. **Epoch release verification:** add SVM tests, client nonce-search benchmarks and account migration before enabling proof-of-work releases on a deployed program.
2. **Receipt indexing:** build a durable, replayable Devnet receipt indexer — [issue #20](https://github.com/Alitiora-Initiative/Space-Ledger/issues/20).
3. **Program assurance:** expand SVM instruction tests, prepare evidence and commission a real independent audit — [issue #21](https://github.com/Alitiora-Initiative/Space-Ledger/issues/21).
4. **Usability:** complete the WCAG 2.2 AA/device audit and add standards-based mobile wallet support — [issues #23](https://github.com/Alitiora-Initiative/Space-Ledger/issues/23) and [#24](https://github.com/Alitiora-Initiative/Space-Ledger/issues/24).
5. **New asset features:** decide and build pixel ownership, then transfers/market settlement — [issues #10](https://github.com/Alitiora-Initiative/Space-Ledger/issues/10) and [#11](https://github.com/Alitiora-Initiative/Space-Ledger/issues/11).

### 6. Epoch proof-of-work release

The on-chain program now gates primary-sale blocks behind an epoch release instruction. Each epoch releases up to 210,000 blocks after a permissionless Bitcoin-style double-SHA256 proof meets the configured target. The proof domain, epoch number, nonce, previous proof hash and difficulty are deterministic; purchases cannot consume unreleased blocks. This is an issuance gate, not Bitcoin consensus or a claim that the application is mainnet-ready.

The client helper in `src/epochPow.js` finds a valid nonce and the Anchor instruction is `mine_epoch`. The current target is intentionally testnet-friendly (12 leading difficulty bits); difficulty, epoch size and account migration must be reviewed before any production deployment. Existing config accounts require an explicit migration because the PoW fields extend account storage.

### 7. Programme tracker

The complete dependency order and project-wide definition of reliable are in [issue #25](https://github.com/Alitiora-Initiative/Space-Ledger/issues/25).

**Network and cost boundary:** Devnet only. Do not change program/treasury/mint IDs, payment instructions, curve economics or migrate to Mainnet without explicit maintainer approval. Do not enable paid RPC, indexer or hosted database services without an agreed cost and approval.

---

## Grant Proposal Execution Roadmap (Proposed; not yet completed)

**Application status:** Submitted to the Solana Foundation on **2026-11-03**, as confirmed by the project operator. No award, approval or disbursement has been confirmed.

**Purpose:** This section records the development and adoption milestones described in the submitted Space Ledger funding application. It is an execution plan, not evidence that funding has been awarded or that the listed work is complete.

**Funding requested:** USD $1,000 equivalent.

**Proposed milestone allocation:**

| Milestone | Proposed amount | Focus | Planned window |
|---|---:|---|---|
| 1 | $350 | Devnet reliability, testing and verification | Weeks 1–2 |
| 2 | $400 | Verifiable on-chain history and visualisation | Weeks 3–5 |
| 3 | $250 | Independent public beta testing and ecosystem documentation | Weeks 6–8 |

The eight-week schedule starts only after an agreed project start date (for example, after funding approval). These amounts are requested milestone allocations, not funds received. Do not describe any milestone as funded, delivered or accepted until that has actually happened.

### Milestone 1 — Devnet reliability, testing and verification ($350 proposed)

**Objective:** Strengthen confidence in the existing Devnet purchase flow and make its behaviour reproducible by other developers.

**Existing baseline (already present in the repository):**
- Anchor program with SOL and Devnet USDC purchase instructions.
- Fixed program treasury and Devnet USDC mint checks.
- SOL/USD oracle freshness and confidence checks in the SOL purchase path.
- Slippage limits and purchase receipts.
- Node.js tests covering application routes, pricing, wallet-related code and service behaviour.
- Existing Devnet beta verification notes documenting an operator-approved purchase and receipt.

The work below extends this baseline; it must not be presented as if no tests or verification exist today.

**Planned tasks:**
- Record the current test/build baseline before changing code.
- Expand Rust/Anchor tests for bonding-curve boundaries, arithmetic overflow, supply limits, receipt fields and invalid purchase inputs.
- Expand backend tests for receipt decoding, quote calculations, stale or invalid oracle data, wrong token mint/account ownership, slippage and unconfigured-program behaviour.
- Check that Devnet SOL and Devnet USDC transactions settle against the intended program and treasury.
- Add or improve a repeatable Devnet smoke-test procedure. Use only test funds and wallets whose operators have explicitly agreed to participate.
- Improve error messages and documentation where a test exposes confusing or unsafe behaviour.

**Acceptance evidence:**
- Test commands and their actual output recorded in the repository or release notes.
- Passing applicable automated tests and build checks.
- At least one reproducible Devnet smoke-test record with a transaction signature and corresponding receipt address (do not publish private keys or recovery phrases).
- Updated beta verification documentation describing what was tested, when, on which cluster and what remains unverified.

**Completion rule:** Mark this milestone complete only when the code, tests, documentation and verifiable Devnet evidence are present. A passing unit test alone is not a security audit.

### Milestone 2 — Verifiable on-chain history and visualisation ($400 proposed)

**Objective:** Show users real purchase and supply history derived from confirmed Solana activity, without generating artificial market data.

**Planned tasks:**
- Inspect the existing `PurchaseSettled` event, purchase receipt accounts and transaction-signature lookup code before designing new storage or endpoints.
- Implement a documented history endpoint for confirmed Devnet purchase events/receipts. Reuse existing RPC and receipt functionality where reliable rather than duplicating it.
- Derive historical supply from confirmed block counts and event order.
- Derive transaction-level purchase values from receipt fields. Clearly distinguish total transaction value from per-block curve price and from a market-traded price.
- Add a history visualisation to the appropriate application page, with loading, error, empty and partial-history states.
- Include timestamps only when grounded in confirmed on-chain records.
- Add tests for ordering, duplicate signatures/receipts, missing history, RPC errors and data consistency.
- Document any history limits, pagination, indexing assumptions, caching and expected RPC costs.

**Data integrity rules:**
- Do not create random candles, synthetic trades, fabricated volume, guessed timestamps or simulated price ticks.
- Do not label a bonding-curve quote or purchase total as an exchange market price.
- If there is insufficient confirmed history, show an honest empty/awaiting-history state.
- Keep the Devnet application history separate from the external external token token and its mainnet liquidity pool. Do not combine their transactions, prices, supply or users into one chart.
- Preserve the Devnet-only status of the application program unless a separate, reviewed mainnet migration is explicitly approved.

**Acceptance evidence:**
- Public endpoint and UI backed by confirmed Devnet receipts/events.
- Automated tests demonstrating that displayed points are derived from source records and that empty/error states work.
- A short data-dictionary/API document defining each plotted field and its meaning.
- Example transaction signatures/receipt addresses that a reviewer can independently inspect on Solana Explorer Devnet.

**Completion rule:** Mark this milestone complete only after the endpoint, visualisation, tests and documentation are deployed or otherwise reproducibly demonstrated. A chart rendering with hard-coded sample values does not count.

### Milestone 3 — Independent public beta testing and ecosystem contribution ($250 proposed)

**Objective:** Gather a small, transparent body of independent feedback and publish useful developer material.

**Proposed adoption targets:**
- At least **10 independent test wallets** participate in the public Devnet beta.
- At least **20 successful, confirmed Devnet purchase receipts** are recorded during the test period.
- At least **3 feedback reports** are received from external testers.

These are targets, not current traction claims. Do not claim they have been achieved until the evidence exists.

**Planned tasks:**
- Publish a clear Devnet test guide explaining wallet network selection, obtaining test SOL/USDC, purchase approval and Explorer verification.
- Invite independent testers and explain that Devnet assets have no real-world value.
- Track unique participating wallet addresses and confirmed receipt/signature counts from on-chain records. Deduplicate repeated activity correctly.
- Collect at least three external feedback reports with permission to quote or publish them.
- Triage feedback into bugs, usability improvements and future feature requests.
- Publish an adoption report showing the measurement period, unique wallet count, confirmed receipt count, known limitations and anonymised feedback themes.
- Publish reusable developer notes on Anchor receipts, wallet transaction flow, Devnet verification and the history API.

**Integrity and privacy rules:**
- Do not create wallets, transactions, testimonials or feedback reports to inflate adoption.
- Do not pay people to manufacture trading activity or describe self-testing as independent adoption.
- Obtain permission before publishing a tester's name, contact details or attributable feedback. Prefer aggregated metrics and wallet addresses only where public-chain verification is necessary.
- Clearly label Devnet transactions as test activity, not real economic volume or revenue.

**Acceptance evidence:**
- Public beta guide.
- Evidence of at least 10 distinct participating wallet addresses and 20 confirmed purchase receipts, with a documented counting method.
- At least three dated external feedback reports, with publication consent or anonymised summaries.
- Public adoption report and updated developer documentation.

**Completion rule:** Mark this milestone complete only when the targets and evidence above are met. If targets are not met, report actual results and explain the shortfall; never alter the numbers to match the target.

### Suggested eight-week sequence

| Period | Work sequence | Expected review point |
|---|---|---|
| Week 1 | Baseline audit of current tests, program, API and Devnet configuration | Baseline note and task list |
| Week 2 | Expand tests, fix verified issues, run Devnet smoke tests | Milestone 1 evidence |
| Week 3 | Design history data model and inspect event/receipt/RPC sources | API design and data dictionary draft |
| Weeks 4–5 | Implement history endpoint, visualisation, error/empty states and tests | Milestone 2 evidence |
| Week 6 | Publish beta guide and recruit independent testers | Test instructions and cohort log |
| Week 7 | Run beta, collect verified receipts and feedback | Interim adoption measurements |
| Week 8 | Publish adoption report, developer notes and final evidence index | Milestone 3 evidence |

The sequence is a planning aid, not a promise that external testers, RPC availability or funding decisions will follow a fixed schedule. Record actual dates and blockers as the work proceeds.

### Evidence log

Update this table only when evidence exists. Add links to commits, test runs, deployed pages, Devnet transactions or documentation.

| Item | Status | Evidence / date |
|---|---|---|
| Funding application submitted | Submitted 2026-11-03 (operator-confirmed); award not confirmed | Keep private submission confirmation; do not publish personal application data |
| Milestone 1 | Not started / In progress / Complete | Add test/build results and Devnet proof |
| Milestone 2 | Not started / In progress / Complete | Add endpoint, chart, tests and sample Devnet records |
| Milestone 3 | Not started / In progress / Complete | Add deduplicated metrics and feedback report |
| Funding received | Not confirmed | Update only after funds have actually arrived |

Use the repository commit history and dated evidence to establish when work was done. Do not backdate completion.

### AI-assisted implementation instructions

The project maintainer may use AI coding assistants to plan, write and review code. AI-generated changes must still be checked against the actual repository and tested. The roadmap is the source of planned scope; it is not permission to invent functionality or claim that a task is complete.

Any AI coding assistant working on this repository must:

1. Read `README.md`, this `ROADMAP.md`, the relevant source files, tests and existing issue notes before proposing changes.
2. Work on one small, reviewable task at a time. State which milestone and acceptance criterion the task supports.
3. Inspect existing functionality first and reuse it where sensible. Do not rewrite working components just to use a preferred framework or library.
4. Preserve the current Devnet-only application configuration. Do not switch RPC endpoints, program IDs, treasury addresses, token mints or wallet destinations to mainnet.
5. Never request, print, commit or expose seed phrases, private keys, wallet JSON files, API secrets or other credentials. Use environment variables for server-side secrets.
6. Never fabricate transaction signatures, receipts, active users, adoption numbers, testimonials, market prices, volume, chart points or test results.
7. Keep the external token mainnet token and its liquidity pool separate from the Space Ledger Devnet application's blocks, receipts, supply and usage metrics.
8. Do not implement mainnet migration, token liquidity changes, a new token sale, or real-value financial features as part of these milestones. Those require a separate explicit scope, legal review and security review.
9. Add or update automated tests for every material behaviour change. Run the relevant checks, report the exact commands and outcomes, and disclose checks that could not be run.
10. Update this roadmap and relevant documentation only after the corresponding implementation and evidence exist. Never change an unchecked item to complete merely because code was generated.
11. Do not describe the program as audited, production-secure or mainnet-ready unless a qualified independent review and the required evidence actually exist.
12. Before any deployment, mainnet operation, wallet transaction involving real funds, or change to production configuration, stop and obtain the project maintainer's explicit approval.

**Recommended instruction to give an AI coding assistant:**

> Read the repository's README.md and ROADMAP.md first. Treat the "Grant Proposal Execution Roadmap" as the scope for planned work, and the existing code/tests as the source of truth for what already exists. Identify the next incomplete task with the clearest acceptance criteria. Inspect the relevant implementation before changing anything. Propose a small implementation plan, make only the necessary changes, add tests, run the relevant checks, and report exact results. Keep the application on Devnet, preserve the separation between the Devnet app and the external token mainnet token, and never invent usage or transaction data. Do not mark roadmap work complete until its acceptance evidence exists. Ask for maintainer approval before deployments, real-fund transactions or production configuration changes.

