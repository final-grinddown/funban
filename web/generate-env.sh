#!/bin/sh
# Generate runtime environment configuration for Next.js
# This script runs at container startup to inject runtime env vars into the frontend

cat <<EOF > /app/public/env.js
window.ENV = {
  API_URL: "${NEXT_PUBLIC_API_URL}",
  WS_URL: "${NEXT_PUBLIC_WS_URL}",
  ENV: "${NEXT_PUBLIC_ENV}"
};
EOF

echo "Generated /app/public/env.js with runtime configuration"
