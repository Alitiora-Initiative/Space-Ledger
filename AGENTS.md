# Repository Agent Instructions

These instructions apply to AI coding assistants and human contributors working in this repository.

## Read before changing code

1. Read `README.md` for the product description, actual capabilities, network separation and local setup.
2. Read `ROADMAP.md`, especially **Grant Proposal Execution Roadmap**, before selecting a task.
3. Read the relevant files under `docs/`, source files and tests before proposing an implementation.
4. Treat the current code and reproducible test output as the source of truth for what exists. A roadmap item is not implemented merely because it is described.

## Project boundaries

- The Space Ledger canvas application and Anchor program are currently **Solana Devnet-only**.
- Keep `SOLANA_RPC_DEVNET`, program IDs, treasury configuration, oracle feed and token mint configuration on their documented Devnet values.
- Do not migrate the canvas application to Mainnet, switch its RPC, change treasury destinations, deploy a new program or make real-fund transactions without explicit approval from the project maintainer.
- The separate external token token is a Solana Mainnet asset. Keep its market data and transactions separate from Devnet canvas purchases, receipts, supply, users and adoption metrics.
- Do not add token liquidity, market-making, speculative token-promotion or unrelated token-sale work to the grant milestones.
- Do not claim the program is audited, production-secure or Mainnet-ready. No independent program audit is recorded as completed.

## Resource and budget constraints

- This is an independently maintained project with limited capital. Prefer existing dependencies, free/open-source tools, public Devnet services and low-cost approaches.
- Do not introduce paid APIs, subscriptions, paid RPC plans, hosted databases, commercial services or recurring infrastructure costs without explicit maintainer approval and a clear cost estimate.
- Do not assume the submitted Solana Foundation application has been approved or paid. The operator reports submission on 2026-11-03; award and disbursement are unconfirmed.

## AI-assisted / vibe-coding workflow

The project maintainer uses AI coding assistants to help plan and implement the product. Keep the workflow understandable and incremental:

1. Explain the task in plain language and identify the roadmap milestone it supports.
2. Inspect the current implementation before suggesting a rewrite.
3. Propose a small plan listing the files to change and the checks to run.
4. Implement one coherent task at a time; avoid broad speculative refactors.
5. Explain important changes and any trade-offs without assuming the maintainer already knows the underlying framework internals.
6. Run relevant tests and report the exact command and result. Clearly state what could not be tested.
7. Update the roadmap only when the acceptance evidence exists.

## How to work

- Select one small, reviewable task at a time and identify the roadmap milestone and acceptance criterion it supports.
- Inspect the existing implementation and reuse working components where possible. Avoid unnecessary rewrites, new dependencies and architectural changes.
- Before editing, state the intended files and tests. After editing, summarise the changes and any remaining risks.
- Add or update automated tests for material behaviour changes.
- Run the relevant checks and report the exact commands and outcomes. Do not say tests passed if they were not run.
- If a required toolchain, RPC endpoint or external service is unavailable, record the limitation rather than fabricating a successful result.
- Update README, guides and roadmap status when behaviour changes. Mark work complete only after its acceptance evidence exists.

## Data integrity and user safety

- Never fabricate users, wallets, transactions, receipts, signatures, testimonials, feedback, prices, chart points, trading volume or adoption metrics.
- Do not count quotes, page views, simulated tests or operator-only activity as independent adoption.
- Build charts only from source data that can be explained and independently checked. Clearly label estimates; show empty/error states when confirmed data is unavailable.
- Do not mix model curve estimates, confirmed Devnet purchase receipts and external token Mainnet market data.
- Never ask for or expose seed phrases, recovery phrases, private keys, wallet JSON files, API secrets or other credentials. Do not commit `.env`.
- Obtain permission before publishing identifiable tester feedback. Prefer aggregated or anonymised reporting.
- Do not make legal, financial or security assurances that are not backed by qualified review.

## Checks

From the repository root, the documented JavaScript checks are:

```bash
npm install
npm test
npm audit
```

The Solana program build uses:

```bash
npm run compile
```

The compile command requires the Solana program build toolchain. Report when that environment is unavailable. Add Rust/Anchor tests where relevant and report exact results.

## Deployment rule

Do not deploy, change production environment variables, alter wallet destinations, or initiate any transaction involving real-value assets without explicit project-maintainer approval. Keep all grant milestone testing on Devnet unless the maintainer separately authorises a reviewed scope change.
