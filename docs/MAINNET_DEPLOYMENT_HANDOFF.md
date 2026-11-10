# Mainnet deployment handoff

The Solana program is built and the deployment command is saved in `scripts/deploy-mainnet.sh`.

## Current status

- Target network: Solana mainnet-beta
- Program upgrade/deployment: pending funding
- Deployment authority: configured through `SOLANA_DEPLOYER_KEYPAIR_JSON`
- RPC: configured through `SOLANA_MAINNET_RPC_URL`
- Program ID: configured through `SOLANA_PROGRAM_ID`
- Minimum observed rent reserve for the current 227 KB binary: 1.15381 SOL, plus transaction fees

## What would happen after funding

The script builds the SBF artifact, verifies that the configured `SOLANA_PROGRAM_ID` matches the checked-in program keypair, checks whether that program already exists on Mainnet, and only then submits an upgrade transaction. It refuses to silently create a different program or deploy to the wrong address. The deployer remains the upgrade authority unless authority is explicitly transferred later.

Run the preflight first:

```bash
SOLANA_MAINNET_RPC_URL=... \
SOLANA_DEPLOYER_KEYPAIR_JSON=... \
SOLANA_PROGRAM_ID=... \
DEPLOY_MAINNET_MODE=UPGRADE \
bash scripts/deploy-mainnet.sh
```

After reviewing the output, set `DEPLOY_MAINNET_CONFIRM=YES` and rerun to submit. Record the program address, signature, authority, and binary hash.

## Zero-capital alternatives

There is no permissionless zero-capital path for deploying a new Solana program: the program account must be rent-exempt and deployment transactions require fees. Devnet faucets can fund testing only, not Mainnet. The viable no-capital options are sponsorship or funding, not bypasses:

- Apply for Solana Foundation grants or public-goods funding.
- Ask a trusted sponsor or multisig to fund the program account and fees without receiving upgrade authority.
- Use a temporary hosted deployment service only after reviewing its custody and upgrade-authority terms.
- Continue on Devnet with the existing wallet while the Mainnet release is audited.

Do not use a borrowed private key, hidden faucet, or an unverified third-party deployer. The script fails closed when the balance is insufficient and never prints the keypair.
