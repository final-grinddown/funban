# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Enable corepack for Yarn 4
RUN corepack enable

# Install dependencies
COPY web/package.json web/yarn.lock web/.yarnrc.yml ./
COPY web/.yarn/ ./.yarn/
RUN yarn install --immutable

# Copy contracts and web source code
COPY contracts/ ../contracts/
COPY web/ ./

# Set placeholder values for NEXT_PUBLIC_* variables during build
# These will be overridden at runtime by generate-env.sh
ENV NEXT_PUBLIC_API_URL="__PLACEHOLDER__" \
    NEXT_PUBLIC_WS_URL="__PLACEHOLDER__" \
    NEXT_PUBLIC_ENV="__PLACEHOLDER__"

RUN yarn build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files from builder
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/.next/standalone/ ./
COPY --from=builder /app/.next/static/ ./.next/static/
COPY --from=builder /app/public/ ./public/

# Copy runtime environment generation script
COPY web/generate-env.sh /app/
RUN chmod +x /app/generate-env.sh

# Expose the port your app runs on
EXPOSE 3000

# Generate runtime configuration and start the application
CMD ["/bin/sh", "-c", "/app/generate-env.sh && node server.js"]