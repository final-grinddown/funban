import { useEffect, useMemo, useRef } from "react"
import { Checkbox, FormControl, FormControlLabel, InputLabel, MenuItem, Select } from "@mui/material"
import { Controller, useForm } from "react-hook-form"
import { createNewNote } from "@/app/api/websocket"
import { useWebSocketContext } from "@/context/WebSocketProvider"
import { useFormValidation, requiredSelectRules } from "@/hooks/useFormValidation"
import { useModalSubmission } from "@/hooks/useModalSubmission"
import { useAppStore, selectUsers } from "@/store"
import { noteStateOptions } from "@/utils/constants"
import { handleKeyDownSubmit } from "@/utils/helpers"
import { BaseModal } from "./BaseModal"
import { NoteTextFieldController } from "./NoteTextFieldController"

interface Props {
  isOpen: boolean
  onClose: () => void
}

interface FormInputs {
  text: string
  state: string
  owner: string
  saveAndCreateNext: boolean
}

export function AddNewNoteModal({ isOpen, onClose }: Props) {
  const { sendMessageAsync, isLoading } = useWebSocketContext()
  const textAreaRef = useRef<HTMLInputElement>(null)
  const modalData = useAppStore((state) => state.modals.addNewNote.data)
  const users = useAppStore(selectUsers)
  const defaultValues = useMemo(
    () => (modalData ? { state: modalData.state, ownerId: modalData.ownerId } : undefined),
    [modalData],
  )
  const hasTextFocus = modalData?.focusText

  const {
    control,
    handleSubmit,
    reset,
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

  // Handle modal submission and auto-close (only close if NOT saveAndCreateNext)
  const { isSubmitting, setIsSubmitting } = useModalSubmission(isLoading, onClose, !isSaveAndCreateNext)

  const textValidation = useFormValidation({
    text,
    isDirty,
    isValid,
  })

  const handleFormSubmit = (data: FormInputs) => {
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
    if (isOpen && defaultValues) {
      reset({
        text: "", // Keep text field properly initialized
        state: defaultValues.state,
        owner: defaultValues.ownerId,
        saveAndCreateNext: false, // Keep all fields properly initialized
      })
    }
  }, [isOpen, reset, defaultValues])

  // Handle focus when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (hasTextFocus && textAreaRef.current) {
          const textAreaElement = textAreaRef.current
          textAreaElement.focus()
        }
      }, 0)
    }
  }, [isOpen, hasTextFocus])

  // Reset form when modal closes (handled by useModalSubmission for normal close)
  useEffect(() => {
    if (!isOpen && !isSaveAndCreateNext) {
      reset({ text: "", state: "", owner: "", saveAndCreateNext: false })
    }
  }, [isOpen, isSaveAndCreateNext, reset])

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Note"
      primaryButtonText="Create Note"
      primaryButtonAction={handleSubmit(handleFormSubmit)}
      primaryButtonDisabled={isSubmitting || !textValidation.isFormSubmittable}
      primaryButtonLoading={isSubmitting}
      primaryButtonWidth="120px"
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
          onKeyDown={(event) =>
            handleKeyDownSubmit(event, handleSubmit, handleFormSubmit, !textValidation.isFormSubmittable)
          }
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
