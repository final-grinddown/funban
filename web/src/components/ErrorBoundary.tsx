/**
 * ErrorBoundary Component
 *
 * Catches React errors and displays fallback UI instead of crashing the entire app.
 * Useful for gracefully handling component errors and providing better UX.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary fallback={<div>Oops! Something went wrong.</div>}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */

import React, { type ReactNode } from "react"
import { Box, Button, Typography } from "@mui/material"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught error:", error, errorInfo)
    // TODO: Send to error reporting service (e.g., Sentry, LogRocket)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided, otherwise show default error UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "400px",
            p: 4,
            textAlign: "center",
          }}
        >
          <Typography variant="h4" gutterBottom color="error">
            Something went wrong
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 600 }}>
            An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
          </Typography>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                bgcolor: "grey.900",
                color: "error.main",
                borderRadius: 1,
                maxWidth: "100%",
                overflow: "auto",
                fontFamily: "monospace",
                fontSize: "0.875rem",
              }}
            >
              <Typography variant="body2" component="pre" sx={{ m: 0 }}>
                {this.state.error.toString()}
                {"\n"}
                {this.state.error.stack}
              </Typography>
            </Box>
          )}
          <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
            <Button variant="contained" onClick={this.handleReset}>
              Try Again
            </Button>
            <Button variant="outlined" onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </Box>
        </Box>
      )
    }

    return this.props.children
  }
}
