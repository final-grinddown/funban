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

# Build Next.js app
# Note: NEXT_PUBLIC_* vars are NOT set here - they're read at runtime by server components
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

# Expose the port your app runs on
EXPOSE 3000

# Start the application
# Runtime env vars are read directly from process.env by the server component
CMD ["node", "server.js"]