import { useEffect, useRef, useState } from "react"
import {
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material"
import { Controller, useForm } from "react-hook-form"
import { TextLengthCounter } from "./TextLengthCounter"
import { createNewNote } from "@/app/api/websocket"
import { useWebSocketContext } from "@/context/WebSocketProvider"
import { useFormValidation, requiredSelectRules } from "@/hooks/useFormValidation"
import { noteStateOptions } from "@/utils/constants"
import { handleKeyDownSubmit } from "@/utils/helpers"
import { IUser } from "@/utils/interfaces"
import { BaseModal } from "./BaseModal"
import { NoteTextFieldController } from "./NoteTextFieldController"

interface Props {
  users: IUser[]
  isOpen: boolean
  onClose: () => void
  hasTextFocus?: boolean
  clearTextFocus?: () => void
  defaultValues?: {
    state: string
    ownerId: string
  }
}

interface FormInputs {
  text: string
  state: string
  owner: string
  saveAndCreateNext: boolean
}

export function AddNewNoteModal({ users, isOpen, onClose, defaultValues, hasTextFocus, clearTextFocus }: Props) {
  const { sendMessageAsync, isLoading } = useWebSocketContext()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textAreaRef = useRef<HTMLInputElement>(null)

  const {
    control,
    handleSubmit,
    reset,
    setFocus,
    watch,
    formState: { errors, isDirty, isValid },
  } = useForm<FormInputs>({
    defaultValues: {
      text: "",
      state: "",
      owner: "",
      saveAndCreateNext: false,
    },
    mode: "onChange",
  })

  const isSaveAndCreateNext = watch("saveAndCreateNext")
  const text = watch("text")

  const textValidation = useFormValidation({
    text,
    isDirty,
    isValid,
  })

  const onSubmit = (data: FormInputs) => {
    const message = createNewNote(data.owner, data.text, data.state)
    sendMessageAsync(message, "New note created!")
    setIsSubmitting(true)

    if (data.saveAndCreateNext) {
      reset({ text: "", state: data.state, owner: data.owner, saveAndCreateNext: data.saveAndCreateNext })

      setTimeout(() => {
        if (textAreaRef.current) {
          textAreaRef.current.focus()
        }
      }, 0)
    }
  }

  // Reset form with defaultValues when modal is opened
  useEffect(() => {
    if (isOpen && defaultValues?.state && defaultValues?.ownerId) {
      reset({
        text: "", // Keep text field properly initialized
        state: defaultValues?.state,
        owner: defaultValues?.ownerId,
        saveAndCreateNext: false, // Keep all fields properly initialized
      })
    }
  }, [isOpen, reset, defaultValues])

  useEffect(() => {
    if (isOpen && !isLoading) {
      if (!isSaveAndCreateNext && isSubmitting) {
        reset({ text: "", state: "", owner: "", saveAndCreateNext: false })
        onClose()
      }

      setTimeout(() => {
        if (hasTextFocus && textAreaRef.current) {
          const textAreaElement = textAreaRef.current
          textAreaElement.focus()

          if (clearTextFocus) {
            clearTextFocus()
          }
        }
      }, 0)

      setIsSubmitting(false)
    }
  }, [isLoading, isOpen, isSaveAndCreateNext, isSubmitting, onClose, reset, setFocus, hasTextFocus, clearTextFocus])

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Note"
      primaryButtonText="Create Note"
      primaryButtonAction={handleSubmit(onSubmit)}
      primaryButtonDisabled={isSubmitting || !textValidation.isFormSubmittable}
      primaryButtonLoading={isSubmitting}
      primaryButtonWidth="120px"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
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
          <Controller
            name="owner"
            control={control}
            rules={requiredSelectRules}
            render={({ field }) => (
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel id="owner-label">Note Owner</InputLabel>
                <Select {...field} labelId="owner-label" label="Note Owner" error={!!errors.owner}>
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id.toString()}>
                      {user.name}
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
            inputRef={textAreaRef}
            sx={{ mt: 2 }}
            onKeyDown={(event) => handleKeyDownSubmit(event, handleSubmit, onSubmit, !textValidation.isFormSubmittable)}
          />
          <Controller
            name="saveAndCreateNext"
            control={control}
            render={({ field }) => (
              <FormControlLabel sx={{ mt: 1 }} control={<Checkbox {...field} />} label="Save and Create Next" />
            )}
          />
        </form>
    </BaseModal>
  )
}
