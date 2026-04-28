import { Button, CircularProgress, Dialog, DialogActions, DialogContent, Typography } from "@mui/material"
import { ModalHeader } from "./modals/ModalHeader"

interface Props {
  isOpen: boolean
  userName: string
  onClose: () => void
  onConfirm: () => void
  isSubmitting: boolean
}

export function DeleteConfirmationModal({ isOpen, userName, onClose, onConfirm, isSubmitting }: Props) {
  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth={true}>
      <ModalHeader title="Confirm Deletion" onClose={onClose} />
      <DialogContent>
        <Typography variant="subtitle1">
          Are you sure you want to delete the user <strong>{userName}</strong>?
        </Typography>
        <Typography variant="subtitle2">
          This operation will permanently remove the user and delete all related board items.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, alignItems: "stretch" }}>
        <Button onClick={onClose} color="secondary" variant="contained">
          Cancel
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained" disabled={isSubmitting} sx={{ width: "90px" }}>
          {isSubmitting ? <CircularProgress size={20} /> : "Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
