#!/bin/bash
set -e

echo "🔍 Running SQLx prepare..."
cargo sqlx prepare -- --bins --tests

# If any SQLx files were generated/modified
if [ -n "$(git status --porcelain .sqlx/)" ]; then
    echo "📝 Normalizing SQLx files..."
    find .sqlx -name "*.json" -type f -exec bash -c '
        # Normalize JSON formatting while preserving tabs in queries
        jq -S "
            .query |= gsub(\"\\\\s+$\"; \"\") |
            .query |= gsub(\"^\\\\s+\"; \"\")
        " "{}" > "{}.tmp" && mv "{}.tmp" "{}"
    ' \;
    
    git add .sqlx/
fi