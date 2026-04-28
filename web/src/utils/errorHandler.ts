/**
 * Centralized Error Handling Utility
 *
 * Provides consistent error handling across the application with:
 * - Custom error types with status codes
 * - Error normalization from unknown types
 * - Error display helpers
 * - Integration points for error reporting services
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
  ) {
    super(message)
    this.name = "AppError"
  }
}

/**
 * Normalizes any error type into an AppError instance
 * Handles Error objects, AppError instances, and unknown error types
 */
export function handleError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }

  if (error instanceof Error) {
    return new AppError(error.message)
  }

  if (typeof error === "string") {
    return new AppError(error)
  }

  return new AppError("An unknown error occurred")
}

/**
 * Displays an error to the user and logs it
 * TODO: Integrate with toast/snackbar system for user notifications
 * TODO: Send to error reporting service (e.g., Sentry, LogRocket)
 */
export function displayError(error: unknown): void {
  const appError = handleError(error)
  console.error("Application Error:", {
    message: appError.message,
    code: appError.code,
    statusCode: appError.statusCode,
    stack: appError.stack,
  })

  // TODO: Show toast/snackbar notification to user
  // Example: showToast({ message: appError.message, severity: 'error' })
}

/**
 * Checks if an error is a network/fetch error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true
  }
  if (error instanceof AppError && error.code === "NETWORK_ERROR") {
    return true
  }
  return false
}

/**
 * Checks if an error is an authentication error (401)
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof AppError && error.statusCode === 401) {
    return true
  }
  return false
}

/**
 * Creates a network error
 */
export function createNetworkError(message: string = "Network request failed"): AppError {
  return new AppError(message, "NETWORK_ERROR", 0)
}

/**
 * Creates an authentication error
 */
export function createAuthError(message: string = "Authentication required"): AppError {
  return new AppError(message, "AUTH_ERROR", 401)
}

/**
 * Creates a validation error
 */
export function createValidationError(message: string): AppError {
  return new AppError(message, "VALIDATION_ERROR", 400)
}
