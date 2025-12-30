/**
 * Runtime environment variable access
 *
 * Handles both:
 * - Production/Docker: Uses window.ENV (injected at container startup via public/env.js)
 * - Local development: Falls back to process.env.NEXT_PUBLIC_* from .env file
 *
 * Note: Next.js only replaces process.env with direct property access (not computed),
 * so we must use direct property access for each variable.
 */

function getEnv(envKey: string, windowKey: string): string | undefined {
  // Client-side: try window.ENV first (production), then fallback to build-time env (local dev)
  if (typeof window !== "undefined") {
    const windowValue = (window.ENV as any)?.[windowKey]
    console.log(`[ENV] Reading ${windowKey}: window.ENV =`, window.ENV, `value =`, windowValue)
    if (windowValue) return windowValue

    // Fallback to build-time environment variables (Next.js inlines these)
    // Must use direct property access for Next.js build-time replacement
    if (envKey === "NEXT_PUBLIC_API_URL") return process.env.NEXT_PUBLIC_API_URL
    if (envKey === "NEXT_PUBLIC_WS_URL") return process.env.NEXT_PUBLIC_WS_URL
    if (envKey === "NEXT_PUBLIC_ENV") return process.env.NEXT_PUBLIC_ENV
    return undefined
  }

  // Server-side: use process.env directly
  // Next.js will inline these at build time
  return envKey === "NEXT_PUBLIC_API_URL"
    ? process.env.NEXT_PUBLIC_API_URL
    : envKey === "NEXT_PUBLIC_WS_URL"
      ? process.env.NEXT_PUBLIC_WS_URL
      : envKey === "NEXT_PUBLIC_ENV"
        ? process.env.NEXT_PUBLIC_ENV
        : undefined
}

// Use getters to ensure values are read at access time, not module load time
// This ensures window.ENV is populated before we try to read from it
export const ENV = {
  get API_URL() {
    return getEnv("NEXT_PUBLIC_API_URL", "API_URL")
  },
  get WS_URL() {
    return getEnv("NEXT_PUBLIC_WS_URL", "WS_URL")
  },
  get ENV() {
    return getEnv("NEXT_PUBLIC_ENV", "ENV")
  },
}
