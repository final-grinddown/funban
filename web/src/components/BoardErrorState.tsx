import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline"
import { Box, Typography, Button } from "@mui/material"

interface Props {
  error?: Error | null
  onRetry?: () => void
}

/**
 * Component for displaying error state on the board.
 * Shows an error message with optional retry functionality.
 */
export function BoardErrorState({ error, onRetry }: Props) {
  if (!error) return null

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="calc(100vh - 250px)"
      gap={2}
      p={4}
    >
      <ErrorOutlineIcon sx={{ fontSize: 64, color: "error.main" }} />
      <Typography variant="h6" color="error">
        Something went wrong
      </Typography>
      <Typography variant="body2" color="text.secondary" textAlign="center">
        {error.message || "An unexpected error occurred while loading the board."}
      </Typography>
      {onRetry && (
        <Button variant="contained" onClick={onRetry} sx={{ mt: 2 }}>
          Retry
        </Button>
      )}
    </Box>
  )
}
