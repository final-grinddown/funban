import { Button, CircularProgress, Dialog, DialogActions, DialogContent, Typography } from "@mui/material"
import { createDeleteNote } from "@/app/api/websocket"
import { useWebSocketContext } from "@/context/WebSocketProvider"
import { useModalSubmission } from "@/hooks/useModalSubmission"
import { useAppStore } from "@/store"
import { ModalHeader } from "./modals/ModalHeader"

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function DeleteNoteModal({ isOpen, onClose }: Props) {
  const { sendMessageAsync, isLoading } = useWebSocketContext()
  const { isSubmitting, setIsSubmitting } = useModalSubmission(isLoading, onClose)
  const noteId = useAppStore((state) => state.modals.deleteNote.data?.noteId)

  const handleDelete = () => {
    if (noteId == null) return
    const message = createDeleteNote(noteId.toString())
    sendMessageAsync(message, "Note deleted successfully!")
    setIsSubmitting(true)
  }

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth>
      <ModalHeader title="Delete Note" onClose={onClose} />
      <DialogContent>
        <Typography variant="body1" color="textPrimary">
          Are you sure you want to delete this note?
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
