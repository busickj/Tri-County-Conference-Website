#!/bin/bash
# Wrapper invoked by the launchd job (com.tricountyconference.mshsaa-sync)
# to run the MSHSAA schedule sync on a schedule. Logs to logs/sync.log.
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

mkdir -p logs
export GOOGLE_APPLICATION_CREDENTIALS="$PROJECT_DIR/service-account-key.json"

if [ ! -f "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
  echo "$(date): service-account-key.json not found, skipping sync" >> logs/sync.log
  exit 1
fi

{
  echo "=== Sync run: $(date) ==="
  node scripts/sync-mshsaa.js --project=tccmid-mo
  echo ""
} >> logs/sync.log 2>&1
