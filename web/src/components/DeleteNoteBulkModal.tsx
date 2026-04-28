import { Button, CircularProgress, Dialog, DialogActions, DialogContent, Typography } from "@mui/material"
import { createDeleteNoteBulk, createDeleteNoteUserBulk } from "@/app/api/websocket"
import { useWebSocketContext } from "@/context/WebSocketProvider"
import { useModalSubmission } from "@/hooks/useModalSubmission"
import { Note } from "@/utils/interfaces"
import { ModalHeader } from "./modals/ModalHeader"

interface Props {
  isOpen: boolean
  userName: string
  userId: Note["owner_id"]
  state: Note["state"]
  isFocus: boolean
  onClose: () => void
}

export function DeleteNoteBulkModal({ isOpen, userId, userName, state, onClose, isFocus }: Props) {
  const { sendMessageAsync, isLoading } = useWebSocketContext()
  const { isSubmitting, setIsSubmitting } = useModalSubmission(isLoading, onClose)

  const handleDelete = () => {
    setIsSubmitting(true)
    const message = isFocus ? createDeleteNoteUserBulk(state, userId) : createDeleteNoteBulk(state)
    sendMessageAsync(message, "Notes deleted successfully!")
  }

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth>
      <ModalHeader title="Delete Note" onClose={onClose} />
      <DialogContent>
        <Typography variant="body1" color="textPrimary">
          {isFocus
            ? `Are you sure you want to delete all notes in state '${state}' for user '${userName}'?`
            : `Are you sure you want to delete all notes in state '${state}' for ALL users?`}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, alignItems: "stretch" }}>
        <Button onClick={onClose} color="secondary" variant="contained">
          Cancel
        </Button>
        <Button onClick={handleDelete} color="error" variant="contained" disabled={isSubmitting} sx={{ width: "90px" }}>
          {isSubmitting ? <CircularProgress size={20} /> : "Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
