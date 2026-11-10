# Mainnet deployment handoff

The Solana program is built and the deployment command is saved in `scripts/deploy-mainnet.sh`.

## Current status

- Target network: Solana mainnet-beta
- Program upgrade/deployment: pending funding
- Deployment authority: configured through `SOLANA_DEPLOYER_KEYPAIR_JSON`
- RPC: configured through `SOLANA_MAINNET_RPC_URL`
- Program ID: configured through `SOLANA_PROGRAM_ID`
- Minimum observed rent reserve for the current 227 KB binary: 1.15381 SOL, plus transaction fees

## Resume procedure

1. Fund the configured deployer wallet with more than the required rent reserve and transaction fees.
2. Run the script without confirmation to perform the balance and deployment preflight.
3. After reviewing the preflight output, rerun with `DEPLOY_MAINNET_CONFIRM=YES` to submit the deployment.
4. Record the resulting program address, deployment signature, upgrade authority, and binary hash in the release record.

The script fails closed when the balance is insufficient and never prints the keypair. Do not commit the keypair or place it in source control.
