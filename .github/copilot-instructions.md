# GitHub Copilot Instructions

Follow the repository-wide rules in [AGENTS.md](../AGENTS.md). Before proposing or editing code, read `README.md`, `ROADMAP.md` (including the Grant Proposal Execution Roadmap), and the relevant documentation/tests.

This is an independently maintained, limited-capital project. Prefer existing dependencies and free/open-source tooling. Do not add paid APIs, subscriptions or recurring infrastructure costs without explicit maintainer approval. The Solana Foundation application was submitted on 2026-11-03 according to the project operator; do not assume it has been awarded or paid.

For every task:
- Identify the specific incomplete roadmap item and acceptance criterion.
- Inspect existing code before making a change; make the smallest safe change.
- Keep the canvas application and Anchor program on Solana Devnet.
- Keep the separate external token Mainnet token data distinct from Devnet canvas data.
- Never invent transaction data, chart points, users, adoption, feedback or test results.
- Add tests, run applicable checks, and report exact results.
- Do not mark roadmap items complete without the evidence required by the roadmap.
- Do not deploy, change production configuration, or initiate real-fund transactions without explicit maintainer approval.

Never request or expose seed phrases, private keys, wallet JSON files, API secrets or committed `.env` files.
