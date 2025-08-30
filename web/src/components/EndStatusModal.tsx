import { useEffect, useState } from "react"
import CloseIcon from "@mui/icons-material/Close"
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  TextField,
} from "@mui/material"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Controller, useForm, useWatch } from "react-hook-form"
import { postSnapshot } from "@/app/api/fetches"
import { IRawNote } from "@/utils/interfaces"

interface Props {
  notes: IRawNote[]
  isOpen: boolean
  onClose: () => void
  accessToken?: string
}

export function EndStatusModal({ notes, accessToken, isOpen, onClose }: Props) {
  const queryClient = useQueryClient()
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid, isDirty },
  } = useForm<{ label: string }>({
    defaultValues: { label: "" },
    mode: "onChange",
  })

  const labelValue = useWatch({
    control,
    name: "label",
  })

  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState("")
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">("success")

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false)
  }

  const mutation = useMutation({
    mutationKey: ["postSnapshot"],
    mutationFn: (data: { label: string }) => postSnapshot({ label: data.label, notes }, accessToken),
    onSuccess: () => {
      onClose()
      setSnackbarMessage("Snapshot sent successfully!")
      setSnackbarSeverity("success")
      setSnackbarOpen(true)
      queryClient.invalidateQueries({ queryKey: ["history"] })
    },
    onError: (error: Error) => {
      onClose()
      setSnackbarMessage(error.message || "Failed to send snapshot")
      setSnackbarSeverity("error")
      setSnackbarOpen(true)
    },
  })

  const onSubmit = handleSubmit((data) => mutation.mutate(data))

  useEffect(() => {
    if (!isOpen) {
      reset()
    }
  }, [isOpen, reset])

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} fullWidth={true}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 0 }}>
          Enter Snapshot Label
          <IconButton edge="end" color="inherit" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Controller
            name="label"
            control={control}
            rules={{
              required: "Label is required.",
              maxLength: { value: 40, message: "Label cannot exceed 40 characters." },
              validate: {
                noLeadingSpaces: (value) => !/^\s/.test(value) || "Label cannot start with a space.",
              },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                autoFocus
                margin="dense"
                label="Snapshot Label"
                fullWidth={true}
                size="small"
                error={!!errors.label}
                helperText={errors.label?.message}
              />
            )}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3 }}>
          <Button onClick={onClose} color="secondary" variant="contained">
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            color="primary"
            variant="contained"
            disabled={!isDirty || !isValid || mutation.isPending || labelValue === ""}
            sx={{ width: "40px" }}
          >
            {mutation.isPending ? <CircularProgress size={20} /> : "Send"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} variant="filled" sx={{ width: "100%" }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  )
}
