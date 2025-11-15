import { useEffect, useRef } from "react"
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material"
import { Controller, useForm } from "react-hook-form"
import { createUpdateNote, createUpdateNoteReorderLast, createUpdateNoteText } from "@/app/api/websocket"
import { useWebSocketContext } from "@/context/WebSocketProvider"
import { useModalSubmission } from "@/hooks/useModalSubmission"
import { MaxTextLength, noteStateOptions } from "@/utils/constants"
import { handleKeyDownSubmit } from "@/utils/helpers"
import { Note } from "@/utils/interfaces"
import { BaseModal } from "./BaseModal"
import { NoteTextFieldController } from "./NoteTextFieldController"

interface Props {
  isOpen: boolean
  noteId: Note["id"]
  noteState: Note["state"]
  noteText: Note["text"]
  onClose: () => void
  hasTextFocus?: boolean
  clearTextFocus?: () => void
}

interface FormInputs {
  text: string
  state: string
}

export function EditNoteModal({ isOpen, noteId, noteState, noteText, onClose, hasTextFocus, clearTextFocus }: Props) {
  const { sendMessageAsync, isLoading } = useWebSocketContext()
  const { isSubmitting, setIsSubmitting } = useModalSubmission(isLoading, onClose)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const {
    control,
    watch,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormInputs>({
    defaultValues: { text: noteText, state: noteState },
    mode: "onChange",
  })

  const text = watch("text")

  const handleFormSubmit = (data: FormInputs) => {
    const hasTextChanged = data.text !== noteText
    const hasStateChanged = data.state !== noteState
    setIsSubmitting(true)

    if (hasTextChanged && hasStateChanged) {
      const combinedMessage = createUpdateNote(noteId.toString(), data.text, data.state)
      sendMessageAsync(combinedMessage, "(Id: " + noteId + ") Note text and status updated!")
    } else if (hasTextChanged) {
      const message = createUpdateNoteText(noteId.toString(), data.text)
      sendMessageAsync(message, "(Id: " + noteId + ") Note text updated!")
    } else if (hasStateChanged) {
      const message = createUpdateNoteReorderLast(noteId.toString(), data.state)
      sendMessageAsync(message, "(Id: " + noteId + ") Note status updated!")
    }
  }

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      reset({ text: noteText, state: noteState })

      // Handle focus if needed
      setTimeout(() => {
        if (hasTextFocus && inputRef.current) {
          const inputElement = inputRef.current
          inputElement.focus()
          inputElement.setSelectionRange(0, inputElement.value.length)

          if (clearTextFocus) {
            clearTextFocus()
          }
        }
      }, 0)
    }
  }, [isOpen, noteText, noteState, reset, hasTextFocus, clearTextFocus])

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Note"
      primaryButtonAction={handleSubmit(handleFormSubmit)}
      primaryButtonDisabled={isSubmitting || !isDirty || text.length > MaxTextLength}
      primaryButtonLoading={isSubmitting}
    >
      <form onSubmit={handleSubmit(handleFormSubmit)}>
          <Controller
            name="state"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel id="state-label">State</InputLabel>
                <Select {...field} labelId="state-label" label="State">
                  {noteStateOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          />
          <NoteTextFieldController
            name="text"
            control={control}
            errors={errors}
            currentText={text}
            autoFocus={hasTextFocus}
            inputRef={inputRef}
            sx={{ my: 2 }}
            onKeyDown={(event) => handleKeyDownSubmit(event, handleSubmit, handleFormSubmit, !isDirty)}
          />
        </form>
    </BaseModal>
  )
}
