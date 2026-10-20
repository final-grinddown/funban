/**
 * Global window type extensions for runtime environment configuration
 */

declare global {
  interface Window {
    ENV: {
      API_URL: string
      WS_URL: string
      ENV: string
    }
  }
}

export {}
