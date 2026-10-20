import { clearApp } from "@/app/api/auth/clearApp"
import { AppError, createAuthError, createNetworkError, createValidationError } from "@/utils/errorHandler"

type FetchMethod = "GET" | "POST" | "PUT" | "DELETE"

interface FetchOptions {
  method?: FetchMethod
  body?: Record<string, unknown> | unknown[]
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
    const message = await readErrorMessage(response)
    console.error("Validation error (400):", message)
    throw createValidationError(message || "Invalid request data")
  } else if (response.status === 403) {
    throw new AppError("You do not have permission to access this resource.", "FORBIDDEN", 403)
  } else if (response.status === 404) {
    throw new AppError("The requested resource could not be found.", "NOT_FOUND", 404)
  } else if (response.status === 409) {
    const message = await readErrorMessage(response)
    throw new AppError(message || "The request conflicts with existing data.", "CONFLICT", 409)
  } else if (response.status === 500) {
    throw new AppError("Internal server error. Please try again later.", "SERVER_ERROR", 500)
  } else if (!response.ok) {
    throw new AppError(
      `Request failed with status ${response.status}. Please try again later.`,
      "UNKNOWN_ERROR",
      response.status,
    )
  }

  // Some endpoints (e.g. DELETE) respond with an empty body
  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

/**
 * Server errors come either as JSON `{ message }` or as plain text
 */
async function readErrorMessage(response: Response): Promise<string> {
  const text = await response.text()
  try {
    const parsed = JSON.parse(text)
    return typeof parsed?.message === "string" ? parsed.message : text
  } catch {
    return text
  }
}
