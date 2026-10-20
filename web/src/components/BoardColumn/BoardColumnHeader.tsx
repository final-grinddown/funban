import { memo } from "react"
import MoreVertIcon from "@mui/icons-material/MoreVert"
import { Box, IconButton, Typography } from "@mui/material"
import { useTheme } from "@mui/material/styles"

interface Props {
  title: string
  onMenuClick: (event: React.MouseEvent<HTMLButtonElement>) => void
  menuOpen: boolean
}

/**
 * Header component for a board column.
 * Displays the column title and a menu button for column actions.
 *
 * Memoized to prevent re-renders when title and menuOpen state haven't changed.
 */
export const BoardColumnHeader = memo(function BoardColumnHeader({ title, onMenuClick, menuOpen }: Props) {
  const theme = useTheme()

  return (
    <Box
      p={2}
      bgcolor="primary.main"
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      sx={{ borderTopLeftRadius: 4, borderTopRightRadius: 4 }}
    >
      <Typography variant="h2">{title}</Typography>
      <IconButton
        onClick={onMenuClick}
        aria-controls={menuOpen ? "basic-column-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={menuOpen ? "true" : undefined}
        sx={{ borderRadius: "50%", padding: 1, border: `2px solid ${theme.palette.text.primary}` }}
      >
        <MoreVertIcon />
      </IconButton>
    </Box>
  )
})
