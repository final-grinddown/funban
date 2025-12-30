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

export const ENV = {
  API_URL: getEnv("NEXT_PUBLIC_API_URL", "API_URL"),
  WS_URL: getEnv("NEXT_PUBLIC_WS_URL", "WS_URL"),
  ENV: getEnv("NEXT_PUBLIC_ENV", "ENV"),
} as const
