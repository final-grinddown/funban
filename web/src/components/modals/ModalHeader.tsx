/**
 * ModalHeader Component
 *
 * Standardized modal header with title and close button.
 * Eliminates duplication of header layout across 12+ modals.
 *
 * Usage:
 * ```tsx
 * <ModalHeader title="Delete Note" onClose={onClose} />
 * <ModalHeader title="Add Note" icon={<AddIcon />} onClose={onClose} />
 * ```
 */

import { memo, type ReactNode } from "react"
import CloseIcon from "@mui/icons-material/Close"
import { Box, DialogTitle, IconButton } from "@mui/material"

interface ModalHeaderProps {
  title: string
  onClose: () => void
  icon?: ReactNode
}

function ModalHeaderComponent({ title, onClose, icon }: ModalHeaderProps) {
  return (
    <DialogTitle
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        pb: 0,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {icon}
        {title}
      </Box>
      <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
        <CloseIcon />
      </IconButton>
    </DialogTitle>
  )
}

export const ModalHeader = memo(ModalHeaderComponent)
