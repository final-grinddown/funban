import { ReactNode } from "react"
import CloseIcon from "@mui/icons-material/Close"
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material"

interface Props {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl"
  fullWidth?: boolean

  // Action buttons
  primaryButtonText?: string
  primaryButtonAction?: () => void
  primaryButtonDisabled?: boolean
  primaryButtonLoading?: boolean
  primaryButtonWidth?: string

  secondaryButtonText?: string
  secondaryButtonAction?: () => void
  secondaryButtonDisabled?: boolean

  // Form submission support
  onSubmit?: () => void
  isSubmitForm?: boolean
}

export function BaseModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "sm",
  fullWidth = true,

  primaryButtonText = "Save",
  primaryButtonAction,
  primaryButtonDisabled = false,
  primaryButtonLoading = false,
  primaryButtonWidth = "72px",

  secondaryButtonText = "Cancel",
  secondaryButtonAction = onClose,
  secondaryButtonDisabled = false,

  onSubmit,
  isSubmitForm = false,
}: Props) {
  const handlePrimaryClick = () => {
    if (isSubmitForm && onSubmit) {
      onSubmit()
    } else if (primaryButtonAction) {
      primaryButtonAction()
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth={fullWidth} maxWidth={maxWidth} disableRestoreFocus>
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: description ? 1 : 0,
        }}
      >
        {title}
        <IconButton edge="end" color="inherit" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {description && (
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            {description}
          </Typography>
        )}
        {children}
      </DialogContent>

      <DialogActions sx={{ px: 3, alignItems: "stretch" }}>
        <Button
          onClick={secondaryButtonAction}
          color="secondary"
          variant="contained"
          disabled={secondaryButtonDisabled}
        >
          {secondaryButtonText}
        </Button>
        <Button
          onClick={handlePrimaryClick}
          color="primary"
          variant="contained"
          disabled={primaryButtonDisabled}
          sx={{ width: primaryButtonWidth }}
        >
          {primaryButtonLoading ? <CircularProgress size={20} /> : primaryButtonText}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
