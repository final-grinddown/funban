import { Button, CircularProgress, Dialog, DialogActions, DialogContent, Typography } from "@mui/material"
import { ModalHeader } from "./modals/ModalHeader"

interface Props {
  isOpen: boolean
  releaseCode: string
  onClose: () => void
  onConfirm: () => void
  isSubmitting: boolean
}

export function DeleteReleaseModal({ isOpen, releaseCode, onClose, onConfirm, isSubmitting }: Props) {
  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth={true}>
      <ModalHeader title="Delete Release" onClose={onClose} />
      <DialogContent>
        <Typography variant="subtitle1">
          Are you sure you want to delete the release <strong>{releaseCode}</strong>?
        </Typography>
        <Typography variant="subtitle2">This operation cannot be undone.</Typography>
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
