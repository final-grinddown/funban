import { useEffect } from "react"
import { Button, CircularProgress, Dialog, DialogActions, DialogContent, TextField } from "@mui/material"
import { Controller, useForm } from "react-hook-form"
import { ModalHeader } from "./modals/ModalHeader"

interface Props {
  isOpen: boolean
  initialName: string
  existingNames: string[]
  onClose: () => void
  onSave: (_newName: string) => void
  isSubmitting: boolean
}

interface FormInputs {
  name: string
}

export function NameEditModal({ isOpen, initialName, existingNames, onClose, onSave, isSubmitting }: Props) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { isValid, isDirty },
  } = useForm<FormInputs>({
    defaultValues: { name: initialName },
    mode: "onChange",
  })

  const handleFormSubmit = (data: FormInputs) => {
    onSave(data.name)
  }

  useEffect(() => {
    if (isOpen) {
      reset({ name: initialName })
    }
  }, [initialName, isOpen, reset])

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth={true}>
      <ModalHeader title="Edit Name" onClose={onClose} />
      <DialogContent>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <Controller
            name="name"
            control={control}
            rules={{
              required: "Name is required.",
              maxLength: { value: 20, message: "Name cannot exceed 20 characters." },
              validate: {
                noLeadingSpaces: (value) => !/^\s/.test(value) || "Name cannot start with a space.",
                uniqueName: (value) =>
                  !existingNames.filter((name) => name !== initialName).includes(value) ||
                  "Name already exists. Please choose a different name.",
              },
            }}
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                label="Name"
                variant="outlined"
                size="small"
                fullWidth={true}
                error={!!error}
                helperText={error ? error.message : ""}
                sx={{ mt: 2 }}
              />
            )}
          />
        </form>
      </DialogContent>
      <DialogActions sx={{ px: 3, alignItems: "stretch" }}>
        <Button onClick={onClose} color="secondary" variant="contained">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit(handleFormSubmit)}
          color="primary"
          variant="contained"
          disabled={isSubmitting || !isValid || !isDirty}
          sx={{ width: "72px" }}
        >
          {isSubmitting ? <CircularProgress size={20} /> : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
