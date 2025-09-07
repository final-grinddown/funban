import { useEffect, useState } from "react"
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
import { createDeleteNoteBulk, createDeleteNoteUserBulk } from "@/app/api/websocket"
import { useWebSocketContext } from "@/context/WebSocketProvider"
import { INote } from "@/utils/interfaces"

interface Props {
  isOpen: boolean
  userName: string
  userId: INote["owner_id"]
  state: INote["state"]
  isFocus: boolean
  onClose: () => void
}

export function DeleteNoteBulkModal({ isOpen, userId, userName, state, onClose, isFocus }: Props) {
  const { sendMessageAsync, isLoading } = useWebSocketContext()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleDelete = () => {
    setIsSubmitting(true)
    const message = isFocus ? createDeleteNoteUserBulk(state, userId) : createDeleteNoteBulk(state)
    sendMessageAsync(message, "Notes deleted successfully!")
  }

  useEffect(() => {
    if (isSubmitting && !isLoading) {
      setIsSubmitting(false)
      onClose()
    }
  }, [isLoading, isSubmitting, onClose])

  // Reset submitting state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsSubmitting(false)
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 0 }}>
        Delete Note
        <IconButton edge="end" color="inherit" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
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
