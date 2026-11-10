# Anchor security review preparation

> **Status: preparation notes only — this is not an independent audit, certification, or Mainnet-readiness statement.**
>
> This document records source-level facts and questions for a qualified independent Solana security reviewer. It does not claim that the reviewer has validated the deployed binary, RPC state, key custody, or runtime behaviour.

## Scope and known deployment identifiers

The reviewed source snapshot is the repository `main` tree at commit `488e59e4b930d978bef7acafc19410eb6eb51c35`.

| Item | Source value |
|---|---|
| Cluster | Solana Devnet |
| Program ID | `EbP7vsnMXPonTfriPUFynco69d69JiXpWbKnwVmz8sgG` |
| Fixed system SOL treasury | `EDZjEbRAtqyC8z6ta6PYHX161Xynt13tWpd7orKERkbz` |
| Fixed Devnet USDC mint | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |
| Supply ceiling in source | 10,000,000,000 blocks |
| Program source | `programs/space-ledger/src/lib.rs` |
| Program package | Anchor Lang / SPL 1.2.1, Pyth receiver SDK 2.0.0 |

The separate external token Mainnet token is not part of this program's asset, payment, or ownership model.

## Program behaviour visible in source

### Instructions

- `initialize` creates the singleton `config` PDA and writes the fixed treasury and zero current supply. The initializer is permissionless; it cannot choose a different treasury in the current source.
- `purchase_sol` reads the current supply, computes the fixed-point curve amount and fee, validates a Pyth SOL/USD update, checks the caller's maximum lamport amount, transfers SOL to the fixed treasury address, then settles a purchase receipt and advances supply.
- `purchase_usdc` reads the current supply, calculates the same USD curve amount plus fee, checks the buyer's maximum, validates the fixed Devnet mint, token-account owners and six decimals, executes `transfer_checked`, then settles the receipt and advances supply.

### Account constraints and state

- Buyer accounts are declared as `Signer`.
- The singleton config is a mutable PDA derived from `[b"config"]`.
- SOL treasury is an unchecked account constrained by address to the fixed treasury constant.
- Each purchase receipt is an initialized PDA derived from `[b"receipt", config.current_supply.to_le_bytes()]`.
- The USDC path checks mint and token-account owner/mint values in the handler; the token program is constrained to Anchor's SPL Token `Program<Token>`.
- `settle_receipt` stores buyer, start block, count, asset, paid units, price, fee and timestamp; then updates supply and emits `PurchaseSettled`.
- The program checks that the purchase has a positive count and that the resulting end position does not exceed the 10-billion-block ceiling.

### Oracle and arithmetic

- The SOL path requests the expected SOL/USD Pyth feed ID from a `PriceUpdateV2`.
- The source limits price age to 90 seconds, rejects non-positive prices, rejects publish times more than 30 seconds in the future, and requires confidence no wider than 10% of the reported price.
- USD-to-lamport conversion bounds the oracle exponent to -12 through 6 and uses checked integer arithmetic with upward rounding.
- Curve arithmetic uses `u128` intermediate values and checked operations before converting to `u64`.

These are observations from source, not a claim that every account combination or deployed instruction has been adversarially tested.

## Threat boundaries to include in an independent audit

1. **Untrusted transaction clients:** a caller can bypass the web app and submit program instructions directly. Server-side quote limits and UI checks are not security boundaries unless also enforced on-chain.
2. **Wallet and signer boundary:** verify every authority and signer relationship, including any duplicate or aliased mutable accounts.
3. **SOL treasury boundary:** independently verify the actual account destination, signer semantics and atomic rollback if a later instruction in the purchase fails.
4. **SPL token boundary:** verify mint ownership, token-program identity, decimals, buyer token-account authority, treasury token-account destination and failure behaviour for frozen/invalid accounts.
5. **Oracle boundary:** verify Pyth program ownership, feed identity, confidence/staleness handling, exponent conversion, clock manipulation assumptions and behaviour during missing/stale updates.
6. **Supply/receipt boundary:** verify concurrent purchase serialization, receipt PDA uniqueness, no gaps/overlaps, maximum range, boundary arithmetic and all state/event values.
7. **Deployment/key boundary:** establish the actual deployed program-data account, binary hash, upgrade authority, build reproducibility and who can authorize an upgrade. These facts are not established by the Rust source file alone.
8. **Availability boundary:** evaluate RPC outages, compute limits, account-rent requirements, account growth and denial-of-service economics.

## Specific review questions (not pre-classified vulnerabilities)

- The web/API layer may apply a per-purchase maximum. The Anchor source itself checks positive count and total supply range but has no separate `MAX_BLOCKS_PER_PURCHASE` constant. The auditor should determine whether this difference is intentional and whether a protocol-level cap is required.
- The USDC handler accepts a token account owned by the fixed treasury and carrying the fixed mint; it does not require one specific associated-token-account address. The auditor should verify whether that is deliberate and safely operational.
- The SOL path performs the transfer CPI before `settle_receipt` checks `config.treasury`. Solana transaction atomicity should roll back the transfer if later settlement fails; this ordering and the exact generated instruction should be verified.
- The source has no explicit pause/emergency-stop instruction. Review whether an emergency control is appropriate and, if so, design a narrowly scoped authority and governance model rather than adding a privileged switch casually.
- Review the accepted Pyth confidence ratio and 90-second age against expected Devnet feed behaviour and the economic consequences of oracle downtime or extreme movements.
- Confirm that the client-generated instruction discriminators, account order, PDA derivation and deployed IDL match the program source.

## Test and build coverage gap

At the reviewed snapshot:

- The Rust `#[cfg(test)]` module contains one test covering curve and fixed-point SOL conversion examples.
- The repository tree contains no root `Anchor.toml` and no Anchor TypeScript/SVM integration suite.
- GitHub Actions runs `cargo build`, `cargo test` and Node.js tests. `cargo build` is a host Rust build; it is not the Solana SBF build artifact.
- The documented `npm run compile` command invokes `cargo build-sbf`, but the CI workflow does not currently install the Solana SBF toolchain or run that command.

Before an audit, add tests for boundary ranges, overflow, invalid oracle inputs, token-account mismatch, wrong mint, slippage, duplicate/overlapping receipts, failed CPI rollback, concurrent purchases and maximum supported block count. Prefer an SVM-based integration harness (for example LiteSVM or the supported Anchor test stack) for account constraints and real instruction execution. Keep any new dependency/version pinned and justify it.

## Auditor evidence package

The maintainer should provide the independent reviewer with:

- the exact source commit and a reproducible SBF build artifact/hash;
- actual Devnet program account and ProgramData account details, deployment slot, upgrade authority and program binary hash;
- current IDL/client instruction definitions and representative decoded Devnet transactions;
- threat model, invariants, account/PDA derivation table, oracle assumptions and treasury/token-account details;
- automated test commands, output, failure history and known limitations;
- disclosure of prior changes, outstanding issues and any previous review findings.

Do not publish private keys, seed phrases, provider API keys or wallet backup data. Do not invent auditor names, audit reports, severity ratings, references or completion status.

## Definition of audit completion

Issue [#21](https://github.com/Alitiora-Initiative/Space-Ledger/issues/21) is complete only when a real, independent, named auditor has delivered a dated report identifying the reviewed commit/build and scope, findings have tracked remediation/retest evidence, and exclusions are disclosed. This preparation document is not that report.

## References

- [Solana security guidance](https://solana.com/docs/tools/security)
- [Solana security review checklist](https://solana.com/developers/migrate-to-solana/complete-guide)
- [Anchor account constraints](https://www.anchor-lang.com/docs/references/account-constraints)
- [LiteSVM](https://github.com/LiteSVM/litesvm)

## Network boundary

Devnet only. This document does not authorize a program deployment/upgrade, Mainnet migration, change to program IDs or treasury, change to payment/token economics, or real-value transactions.
