#!/bin/bash
# Wrapper script that loads secrets and runs the database migration

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECRETS_FILE="${SCRIPT_DIR}/generated-secrets.env"

if [ ! -f "$SECRETS_FILE" ]; then
    echo "❌ Error: generated-secrets.env not found at $SECRETS_FILE"
    exit 1
fi

echo "🔐 Loading secrets from generated-secrets.env..."
set -a
source "$SECRETS_FILE"
set +a

echo "🚀 Running database migration..."
exec "${SCRIPT_DIR}/prod-to-dev.sh"
