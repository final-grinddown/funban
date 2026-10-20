import { BackdropLoading } from "./BackdropLoading"

interface Props {
  isLoading: boolean
  isInDashboard?: boolean
}

/**
 * Component for displaying loading state on the board.
 * Wraps the BackdropLoading component with board-specific configuration.
 */
export function BoardLoadingState({ isLoading, isInDashboard = true }: Props) {
  if (!isLoading) return null

  return <BackdropLoading isInDashboard={isInDashboard} />
}
