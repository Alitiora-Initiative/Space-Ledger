# Cross-chain release architecture

## Scope

The protocol uses Bitcoin as a proof-of-work checkpoint, Solana as the epoch-release ledger, and Base as an EVM settlement mirror. This is an attestation flow, not a trustless bridge.

1. A relayer obtains a Bitcoin header and validates its double-SHA-256 target and parent linkage with `src/bitcoinCheckpoint.js`.
2. The relayer reads the Solana epoch state after `mine_epoch` has released the epoch. The Solana program remains authoritative for block ownership and supply.
3. The relayer signs the canonical release tuple `(Base contract, Base chain ID, epoch, Bitcoin height, Bitcoin hash, Solana root, amount)`.
4. `contracts/BitcoinAnchoredRelease.sol` verifies the attestor signature, rejects replayed epochs, and emits the Base settlement event.

## Production controls

- Use a dedicated relayer key, separate from the Solana upgrade authority and Base contract owner.
- Pin Bitcoin network, minimum confirmation depth, expected difficulty bits, and a checkpoint ancestry policy before signing.
- Pin the Solana program ID, epoch, release amount, and state root in the relayer database; reject mismatches.
- Deploy the Solidity contract only to Base mainnet (`chainId 8453`) after bytecode verification and an owner/attestor rotation ceremony.
- Do not treat the Base event as proof of Bitcoin or Solana state without independently checking the signed tuple and contract address.
- Rotate the attestor through a timelocked governance action; emergency owner actions must pause releases off-chain before rotation.

## Not included

This repository does not contain a trustless Bitcoin SPV verifier on Solana, a production relayer, bridge custody, or a deployed Base address. Those require an external operational key ceremony and independent security review before mainnet use.
