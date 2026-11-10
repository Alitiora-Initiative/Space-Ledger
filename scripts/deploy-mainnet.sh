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
PROGRAM_KEYPAIR="$PROGRAM_DIR/target/deploy/space_ledger-keypair.json"
MODE="${DEPLOY_MAINNET_MODE:-UPGRADE}"

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

if [ ! -f "$PROGRAM_KEYPAIR" ]; then
  echo "Missing program keypair: $PROGRAM_KEYPAIR" >&2
  exit 3
fi
ARTIFACT_PROGRAM_ID="$(solana address -k "$PROGRAM_KEYPAIR")"
if [ "$ARTIFACT_PROGRAM_ID" != "$SOLANA_PROGRAM_ID" ]; then
  echo "Program ID mismatch: SOLANA_PROGRAM_ID=$SOLANA_PROGRAM_ID, artifact=$ARTIFACT_PROGRAM_ID" >&2
  echo "Refusing to deploy; rebuild with the verified program keypair or update the configured ID." >&2
  exit 4
fi

if [ "$MODE" != "UPGRADE" ] && [ "$MODE" != "CREATE" ]; then
  echo "DEPLOY_MAINNET_MODE must be UPGRADE or CREATE" >&2
  exit 5
fi

if [ "$MODE" = "UPGRADE" ]; then
  if ! solana program show "$SOLANA_PROGRAM_ID" --url "$RPC" >/dev/null 2>&1; then
    echo "No existing Mainnet program account found for $SOLANA_PROGRAM_ID; refusing an upgrade." >&2
    echo "Use CREATE only after explicitly approving a new Mainnet program ID." >&2
    exit 6
  fi
else
  if solana program show "$SOLANA_PROGRAM_ID" --url "$RPC" >/dev/null 2>&1; then
    echo "Program already exists; refusing CREATE mode." >&2
    exit 7
  fi
fi

solana program deploy target/deploy/space_ledger.so \
  --program-id "$PROGRAM_KEYPAIR" \
  --upgrade-authority "$KEYPAIR" \
  --url "$RPC" \
  --keypair "$KEYPAIR"

echo "Deployment submitted for program $SOLANA_PROGRAM_ID"
