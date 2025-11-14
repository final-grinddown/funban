import { useEffect, useRef } from "react"
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material"
import { Controller, useForm } from "react-hook-form"
import { createSplitNote } from "@/app/api/websocket"
import { useWebSocketContext } from "@/context/WebSocketProvider"
import { useModalSubmission } from "@/hooks/useModalSubmission"
import { MaxTextLength } from "@/utils/constants"
import { handleKeyDownSubmit } from "@/utils/helpers"
import { Note, User } from "@/utils/interfaces"
import { ModalHeader } from "./modals/ModalHeader"
import { TextLengthCounter } from "./TextLengthCounter"

interface Props {
  isOpen: boolean
  originalNote: Note
  users: User[]
  onClose: () => void
  hasTextFocus?: boolean
  clearTextFocus?: () => void
  selectedUserId?: number
}

interface FormInputs {
  originalText: string
  newText: string
  newState: string
  newOwner: string
}

export function SplitNoteModal({
  isOpen,
  originalNote,
  users,
  onClose,
  hasTextFocus,
  clearTextFocus,
  selectedUserId,
}: Props) {
  const { sendMessageAsync, isLoading } = useWebSocketContext()
  const { isSubmitting, setIsSubmitting } = useModalSubmission(isLoading, onClose)
  const originalTextRef = useRef<HTMLInputElement | null>(null)
  const newTextRef = useRef<HTMLInputElement | null>(null)

  const {
    control,
    watch,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isValid },
  } = useForm<FormInputs>({
    defaultValues: {
      originalText: originalNote.text,
      newText: originalNote.text,
      newState: originalNote.state,
      newOwner: originalNote.owner_id.toString(),
    },
    mode: "onChange",
  })

  const originalText = watch("originalText")
  const newText = watch("newText")

  const onSubmit = (data: FormInputs) => {
    setIsSubmitting(true)
    const message = createSplitNote(
      originalNote.id.toString(),
      data.originalText,
      data.newText,
      data.newState !== originalNote.state ? data.newState : undefined,
      data.newOwner !== originalNote.owner_id.toString() ? data.newOwner : undefined
    )
    sendMessageAsync(message, `Note split successfully!`)
  }

  useEffect(() => {
    if (isOpen) {
      const newOwnerId = selectedUserId ? selectedUserId.toString() : originalNote.owner_id.toString()

      reset({
        originalText: originalNote.text,
        newText: originalNote.text,
        newState: originalNote.state,
        newOwner: newOwnerId,
      })

      // Handle focus management
      setTimeout(() => {
        if (hasTextFocus) {
          if (originalTextRef.current) {
            const inputElement = originalTextRef.current
            inputElement.focus()
            inputElement.setSelectionRange(0, inputElement.value.length)
          }
          if (clearTextFocus) {
            clearTextFocus()
          }
        }
      }, 0)
    }
  }, [isOpen, originalNote, reset, selectedUserId, hasTextFocus, clearTextFocus])

  // Check if both text fields are valid and at least one has changed
  const isFormValid =
    isValid &&
    isDirty &&
    originalText.length > 0 &&
    originalText.length <= MaxTextLength &&
    newText.length > 0 &&
    newText.length <= MaxTextLength &&
    (originalText !== originalNote.text || newText !== originalNote.text)

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="md" disableRestoreFocus>
      <ModalHeader title="Split Note" onClose={onClose} />
      <DialogContent>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Split this note into two separate notes. You can edit both the original and new note content, and set different states and owners.
        </Typography>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", md: "row" } }}>
            {/* Original Note Column */}
            <Box sx={{ flex: 1, border: 1, borderColor: "divider", borderRadius: 1, p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Original Note
              </Typography>
                
              <Controller
                name="originalText"
                control={control}
                rules={{ 
                  required: "Text is required",
                  maxLength: { value: MaxTextLength, message: `Text cannot exceed ${MaxTextLength} characters` }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    inputRef={originalTextRef}
                    label="Note Text"
                    multiline
                    minRows={6}
                    variant="outlined"
                    fullWidth
                    sx={{ mb: 2 }}
                    error={!!errors.originalText}
                    helperText={errors.originalText ? errors.originalText.message : ""}
                    onKeyDown={(event) => handleKeyDownSubmit(event, handleSubmit, onSubmit, !isFormValid)}
                  />
                )}
              />
              
              {originalText && originalText.length > 0 && (
                <TextLengthCounter currentLength={originalText.length} maxLength={MaxTextLength} />
              )}
            </Box>

            {/* New Note Column */}
            <Box sx={{ flex: 1, border: 1, borderColor: "divider", borderRadius: 1, p: 2 }}>
              <Typography variant="h6" gutterBottom>
                New Note
              </Typography>
              
              <Controller
                name="newText"
                control={control}
                rules={{ 
                  required: "Text is required",
                  maxLength: { value: MaxTextLength, message: `Text cannot exceed ${MaxTextLength} characters` }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    inputRef={newTextRef}
                    label="Note Text"
                    multiline
                    minRows={4}
                    variant="outlined"
                    fullWidth
                    sx={{ mb: 2 }}
                    error={!!errors.newText}
                    helperText={errors.newText ? errors.newText.message : ""}
                    onKeyDown={(event) => handleKeyDownSubmit(event, handleSubmit, onSubmit, !isFormValid)}
                  />
                )}
              />
              
              <Controller
                name="newState"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>State</InputLabel>
                    <Select {...field} label="State">
                      <MenuItem value="notes">Notes</MenuItem>
                      <MenuItem value="todo">To Do</MenuItem>
                      <MenuItem value="in_progress">In Progress</MenuItem>
                      <MenuItem value="done">Done</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />

              <Controller
                name="newOwner"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Note Owner</InputLabel>
                    <Select {...field} label="Note Owner">
                      {users.map((user) => (
                        <MenuItem key={user.id} value={user.id.toString()}>
                          {user.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
              
              {newText && newText.length > 0 && (
                <TextLengthCounter currentLength={newText.length} maxLength={MaxTextLength} />
              )}
            </Box>
          </Box>
        </form>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, alignItems: "stretch" }}>
        <Button onClick={onClose} color="secondary" variant="contained">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          color="primary"
          variant="contained"
          disabled={!isFormValid || isSubmitting}
          sx={{ width: "100px" }}
        >
          {isSubmitting ? <CircularProgress size={20} /> : "Split Note"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}