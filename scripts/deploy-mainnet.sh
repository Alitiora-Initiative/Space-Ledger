#!/usr/bin/env bash
set -euo pipefail

: "${SOLANA_MAINNET_RPC_URL:?SOLANA_MAINNET_RPC_URL is required}"
: "${SOLANA_DEPLOYER_KEYPAIR_JSON:?SOLANA_DEPLOYER_KEYPAIR_JSON is required}"
: "${SOLANA_PROGRAM_ID:?SOLANA_PROGRAM_ID is required}"

KEYPAIR="$(mktemp)"
trap 'rm -f "$KEYPAIR"' EXIT
printf '%s' "$SOLANA_DEPLOYER_KEYPAIR_JSON" > "$KEYPAIR"
chmod 600 "$KEYPAIR"

RPC="$SOLANA_MAINNET_RPC_URL"
PROGRAM_DIR="$(cd "$(dirname "$0")/../programs/space-ledger" && pwd)"

solana config set --url "$RPC" --keypair "$KEYPAIR" >/dev/null
BALANCE="$(solana balance --lamports | awk '{print $1}')"
REQUIRED="$(solana rent 227000 --lamports | awk '{print $1}')"

if [ "$BALANCE" -lt "$REQUIRED" ]; then
  echo "Insufficient deployer balance: $BALANCE lamports available; $REQUIRED lamports required before fees." >&2
  exit 2
fi

if [ "${DEPLOY_MAINNET_CONFIRM:-}" != "YES" ]; then
  echo "Preflight passed. Set DEPLOY_MAINNET_CONFIRM=YES to submit the deployment." >&2
  exit 0
fi

cd "$PROGRAM_DIR"
cargo build-sbf
solana program deploy target/deploy/space_ledger.so \
  --program-id target/deploy/space_ledger-keypair.json \
  --upgrade-authority "$KEYPAIR" \
  --url "$RPC" \
  --keypair "$KEYPAIR"

echo "Deployment submitted for program $SOLANA_PROGRAM_ID"
