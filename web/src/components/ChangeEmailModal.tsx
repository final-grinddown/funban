import { useEffect, useState } from "react"
import CloseIcon from "@mui/icons-material/Close"
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined"
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  TextField,
} from "@mui/material"
import { Controller, useForm } from "react-hook-form"
import { clearApp } from "@/app/api/auth/clearApp"
import { changeEmail } from "@/app/api/fetches"
import { hasCode } from "@/utils/helpers"

interface Props {
  isOpen: boolean
  onClose: () => void
  accessToken?: string
}

interface FormInputs {
  new_email: string
}

export function ChangeEmailModal({ isOpen, onClose, accessToken }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    setFocus,
    setError,
    formState: { errors, isDirty, isValid },
  } = useForm<FormInputs>({
    defaultValues: {
      new_email: "",
    },
    mode: "all",
  })

  //const isSaveAndCreateNext = watch("saveAndCreateNext")

  const onSubmit = async (data: FormInputs) => {
    setIsSubmitting(true)
    try {
      await changeEmail(data.new_email, accessToken)
      onClose()
      clearApp()
    } catch (err) {
      if (hasCode(err)) {
        switch (err.code) {
          case "INVALID_EMAIL":
            setError("new_email", { message: err.message })
        }
      }

      console.error(err)
    }

    setIsSubmitting(false)
  }

  // Reset form with defaultValues when modal is opened
  useEffect(() => {
    if (isOpen) {
      reset({
        new_email: "",
      })

      setFocus("new_email")
    }
  }, [isOpen, reset, setFocus])

  return (
    <Dialog disableRestoreFocus open={isOpen} onClose={onClose} fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 0 }}>
        Change email
        <IconButton edge="end" color="inherit" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Alert
          icon={<InfoOutlinedIcon fontSize="small" />}
          severity="info"
          sx={{
            mx: 2,
            bgcolor: "rgba(0, 30, 60, 0.8)",
            color: "grey.300",
            "& .MuiAlert-icon": {
              color: "grey.300",
            },
            border: "1px solid rgba(30, 73, 118, 0.5)",
            borderRadius: 2,
          }}
        >
          After email/login change, you will be logged out and need to log in again.
        </Alert>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Controller
            name="new_email"
            control={control}
            rules={{ required: "New email is required" }}
            render={({ field }) => (
              <FormControl fullWidth sx={{ mt: 2 }}>
                <TextField
                  {...field}
                  type="email"
                  inputRef={field.ref}
                  helperText={errors.new_email?.message}
                  label="New email"
                  error={!!errors.new_email}
                  autoFocus
                />
              </FormControl>
            )}
          />
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
          disabled={isSubmitting || !isDirty || !isValid}
          sx={{ width: "92px" }}
        >
          {isSubmitting ? <CircularProgress size={20} /> : "Submit"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
