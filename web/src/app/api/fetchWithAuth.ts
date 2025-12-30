import { clearApp } from "@/app/api/auth/clearApp"
import { AppError, createAuthError, createNetworkError, createValidationError } from "@/utils/errorHandler"

type FetchMethod = "GET" | "POST" | "PUT" | "DELETE"

interface FetchOptions {
  method?: FetchMethod
  body?: Record<string, unknown>
  headers?: Record<string, string>
}

export async function fetchWithAuth<T>(url: string, accessToken?: string, options: FetchOptions = {}): Promise<T> {
  if (!accessToken) {
    throw createAuthError("No access token available")
  }

  const { method = "GET", body, headers = {} } = options

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw createNetworkError("Network request failed. Please check your connection.")
  }

  if (response.status === 401) {
    console.warn("Authentication failed (401). Clearing session and redirecting to login.")
    clearApp()
    throw createAuthError("Your session has expired. Please sign in again.")
  } else if (response.status === 400) {
    const error = await response.json()
    console.error("Validation error (400):", error)
    throw createValidationError(error.message || "Invalid request data")
  } else if (response.status === 403) {
    throw new AppError("You do not have permission to access this resource.", "FORBIDDEN", 403)
  } else if (response.status === 404) {
    throw new AppError("The requested resource could not be found.", "NOT_FOUND", 404)
  } else if (response.status === 500) {
    throw new AppError("Internal server error. Please try again later.", "SERVER_ERROR", 500)
  } else if (!response.ok) {
    throw new AppError(
      `Request failed with status ${response.status}. Please try again later.`,
      "UNKNOWN_ERROR",
      response.status,
    )
  }

  return response.json()
}
