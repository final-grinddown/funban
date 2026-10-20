import { useEffect } from "react"
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material"
import { Controller, useForm } from "react-hook-form"
import { ITeamMember, Release, ReleaseInsert, ReleaseType } from "@/utils/interfaces"
import { ReleaseCodeMaxLength, releaseTypeLabels, toDateTimeInputValue } from "@/utils/release"
import { ModalHeader } from "./modals/ModalHeader"

interface Props {
  isOpen: boolean
  /** Release being edited; omit to create a new one */
  release?: Release
  users: ITeamMember[]
  onClose: () => void
  onSave: (data: ReleaseInsert) => void
  isSubmitting: boolean
  errorMessage?: string
}

interface FormInputs {
  release_code: string
  release_type: ReleaseType
  release_at: string
  assignee_id: number | ""
}

const emptyForm: FormInputs = {
  release_code: "",
  release_type: "application",
  release_at: "",
  assignee_id: "",
}

function toFormInputs(release?: Release): FormInputs {
  if (!release) return emptyForm

  return {
    release_code: release.release_code,
    release_type: release.release_type,
    release_at: toDateTimeInputValue(release.release_at),
    // "" means unassigned; a deleted assignee also shows as unassigned until replaced
    assignee_id: release.assignee_id ?? "",
  }
}

export function ReleaseFormModal({ isOpen, release, users, onClose, onSave, isSubmitting, errorMessage }: Props) {
  const isEdit = !!release
  const {
    control,
    handleSubmit,
    reset,
    formState: { isValid, isDirty },
  } = useForm<FormInputs>({
    defaultValues: toFormInputs(release),
    mode: "onChange",
  })

  useEffect(() => {
    if (isOpen) {
      reset(toFormInputs(release))
    }
  }, [isOpen, release, reset])

  const handleFormSubmit = (data: FormInputs) => {
    onSave({
      release_code: data.release_code.trim(),
      release_type: data.release_type,
      release_at: data.release_at,
      assignee_id: data.assignee_id === "" ? null : Number(data.assignee_id),
    })
  }

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth={true}>
      <ModalHeader title={isEdit ? "Edit Release" : "New Release"} onClose={onClose} />
      <DialogContent>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <Stack spacing={2} sx={{ mt: 2 }}>
            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

            <Controller
              name="release_code"
              control={control}
              rules={{
                required: "Release code is required.",
                maxLength: {
                  value: ReleaseCodeMaxLength,
                  message: `Release code cannot exceed ${ReleaseCodeMaxLength} characters.`,
                },
                validate: (value) => value.trim().length > 0 || "Release code is required.",
              }}
              render={({ field, fieldState: { error } }) => (
                <TextField
                  {...field}
                  label="Release code"
                  placeholder="e.g. 20261020"
                  size="small"
                  fullWidth={true}
                  autoFocus={!isEdit}
                  error={!!error}
                  helperText={error?.message}
                />
              )}
            />

            <Controller
              name="release_type"
              control={control}
              render={({ field }) => (
                <TextField {...field} select={true} label="Type" size="small" fullWidth={true}>
                  {(Object.keys(releaseTypeLabels) as ReleaseType[]).map((type) => (
                    <MenuItem key={type} value={type}>
                      {releaseTypeLabels[type]}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            <Controller
              name="release_at"
              control={control}
              rules={{ required: "Date and time are required." }}
              render={({ field, fieldState: { error } }) => (
                <TextField
                  {...field}
                  type="datetime-local"
                  label="Date & time"
                  size="small"
                  fullWidth={true}
                  error={!!error}
                  helperText={error?.message}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              )}
            />

            <Controller
              name="assignee_id"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select={true}
                  label="Assigned developer"
                  size="small"
                  fullWidth={true}
                  helperText={
                    isEdit && release?.assignee_id === null && release.assignee_name !== null
                      ? `${release.assignee_name} is no longer a team member. Choose a new assignee or save to leave the release unassigned.`
                      : undefined
                  }
                  slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
                >
                  <MenuItem value="">
                    <em>Unassigned</em>
                  </MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Stack>
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
          disabled={isSubmitting || !isValid || (isEdit && !isDirty)}
          sx={{ width: "72px" }}
        >
          {isSubmitting ? <CircularProgress size={20} /> : isEdit ? "Save" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
