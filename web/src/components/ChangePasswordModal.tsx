"use client"
import { useEffect, useState } from "react"
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined"
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  FormControl,
  TextField,
} from "@mui/material"
import { Controller, useForm } from "react-hook-form"
import { clearApp } from "@/app/api/auth/clearApp"
import { changePassword } from "@/app/api/fetches"
import { useConfig } from "@/context/ConfigProvider"
import { hasCode } from "@/utils/helpers"
import { ModalHeader } from "./modals/ModalHeader"

interface Props {
  isOpen: boolean
  onClose: () => void
  accessToken?: string
}

interface FormInputs {
  oldPassword: string
  newPassword: string
  newPasswordConfirm: string
}

export function ChangePasswordModal({ isOpen, onClose, accessToken }: Props) {
  const { apiUrl } = useConfig()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    setFocus,
    setError,
    formState: { errors, isDirty, isValid },
    watch,
  } = useForm<FormInputs>({
    defaultValues: {
      oldPassword: "",
      newPassword: "",
      newPasswordConfirm: "",
    },
    mode: "all",
  })

  //const isSaveAndCreateNext = watch("saveAndCreateNext")

  const handleFormSubmit = async (data: FormInputs) => {
    setIsSubmitting(true)
    try {
      await changePassword(apiUrl, data.oldPassword, data.newPassword, accessToken)
      onClose()
      clearApp()
    } catch (err) {
      if (hasCode(err)) {
        switch (err.code) {
          case "INVALID_PASSWORD":
            setError("oldPassword", { message: err.message })
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
        oldPassword: "",
        newPassword: "",
        newPasswordConfirm: "",
      })

      setFocus("oldPassword")
    }
  }, [isOpen, reset, setFocus])

  return (
    <Dialog disableRestoreFocus open={isOpen} onClose={onClose} fullWidth>
      <ModalHeader title="Change password" onClose={onClose} />
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
          After password change, you will be logged out and need to log in again.
        </Alert>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <Controller
            name="oldPassword"
            control={control}
            rules={{ required: "Old password is required" }}
            render={({ field }) => (
              <FormControl fullWidth sx={{ mt: 2 }}>
                <TextField
                  {...field}
                  type="password"
                  inputRef={field.ref}
                  helperText={errors.oldPassword?.message}
                  label="Old password"
                  error={!!errors.oldPassword}
                  autoFocus
                />
              </FormControl>
            )}
          />
          <Controller
            name="newPassword"
            control={control}
            rules={{ required: "New password is required" }}
            render={({ field }) => (
              <FormControl fullWidth sx={{ mt: 2 }}>
                <TextField
                  {...field}
                  type="password"
                  inputRef={field.ref}
                  label="New password"
                  helperText={errors.newPassword?.message}
                  error={!!errors.newPassword}
                />
              </FormControl>
            )}
          />
          <Controller
            name="newPasswordConfirm"
            control={control}
            rules={{
              required: "Repeated new password is required",
              validate: (value) => value === watch("newPassword") || "Passwords do not match",
            }}
            render={({ field }) => (
              <FormControl fullWidth sx={{ mt: 2 }}>
                <TextField
                  {...field}
                  type="password"
                  inputRef={field.ref}
                  helperText={errors.newPasswordConfirm?.message}
                  label="New password again"
                  error={!!errors.newPasswordConfirm}
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
          onClick={handleSubmit(handleFormSubmit)}
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
