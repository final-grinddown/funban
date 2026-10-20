import { useEffect } from "react"
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, TextField, Typography } from "@mui/material"
import { Controller, useForm } from "react-hook-form"
import { CloseSummaryMaxLength, DefaultCloseSummary } from "@/utils/release"
import { ModalHeader } from "./modals/ModalHeader"

interface Props {
  isOpen: boolean
  releaseCode: string
  /** Summary from a previous close, used instead of the default after reopening */
  previousSummary?: string | null
  onClose: () => void
  onConfirm: (summary: string) => void
  isSubmitting: boolean
  errorMessage?: string
}

interface FormInputs {
  summary: string
}

export function CloseReleaseModal({
  isOpen,
  releaseCode,
  previousSummary,
  onClose,
  onConfirm,
  isSubmitting,
  errorMessage,
}: Props) {
  const initialSummary = previousSummary || DefaultCloseSummary
  const {
    control,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useForm<FormInputs>({
    defaultValues: { summary: initialSummary },
    mode: "onChange",
  })

  useEffect(() => {
    if (isOpen) {
      reset({ summary: initialSummary })
    }
  }, [isOpen, initialSummary, reset])

  const handleFormSubmit = (data: FormInputs) => {
    onConfirm(data.summary.trim())
  }

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth={true}>
      <ModalHeader title="Close Release" onClose={onClose} />
      <DialogContent>
        <Typography variant="subtitle1" sx={{ mt: 1 }}>
          Close the release <strong>{releaseCode}</strong>? It becomes read-only until it is reopened.
        </Typography>
        {errorMessage && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {errorMessage}
          </Alert>
        )}
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <Controller
            name="summary"
            control={control}
            rules={{
              required: "Summary is required.",
              maxLength: {
                value: CloseSummaryMaxLength,
                message: `Summary cannot exceed ${CloseSummaryMaxLength} characters.`,
              },
              validate: (value) => value.trim().length > 0 || "Summary is required.",
            }}
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                label="Summary"
                multiline={true}
                minRows={3}
                fullWidth={true}
                error={!!error}
                helperText={error?.message}
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
          disabled={isSubmitting || !isValid}
          sx={{ width: "90px" }}
        >
          {isSubmitting ? <CircularProgress size={20} /> : "Close"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
