import { useEffect, useRef, useState } from "react"
import AddIcon from "@mui/icons-material/Add"
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward"
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward"
import DeleteIcon from "@mui/icons-material/Delete"
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Session } from "next-auth"
import { useSession } from "next-auth/react"
import { updateReleaseSteps } from "@/app/api/fetches"
import { useConfig } from "@/context/ConfigProvider"
import { releaseStepsQueryKey, useReleaseSteps } from "@/hooks/useReleaseSteps"
import { handleError } from "@/utils/errorHandler"
import { ReleaseStep, ReleaseType } from "@/utils/interfaces"
import { releaseTypeLabels } from "@/utils/release"

const STEP_TITLE_MAX_LENGTH = 2000
const STEP_TIMING_MAX_LENGTH = 100
const ALL_TYPES = "all"

/** Steps being edited, with a stable key so rows keep focus while reordering */
interface StepRow extends ReleaseStep {
  key: number
}

export function ReleaseStepsForm() {
  const { apiUrl } = useConfig()
  const { data: session } = useSession() as { data: Session }
  const queryClient = useQueryClient()
  const { data: steps, isLoading, error } = useReleaseSteps()
  const [rows, setRows] = useState<StepRow[]>([])
  const nextKey = useRef(0)

  const toRow = (step: ReleaseStep): StepRow => ({ ...step, key: nextKey.current++ })

  useEffect(() => {
    if (!steps) return
    setRows(steps.map(toRow))
  }, [steps])

  const saveMutation = useMutation({
    mutationFn: (data: ReleaseStep[]) => updateReleaseSteps(apiUrl, data, session?.accessToken),
    onSuccess: (updated) => queryClient.setQueryData(releaseStepsQueryKey, updated),
  })

  const updateRow = (key: number, changes: Partial<ReleaseStep>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...changes } : row)))
  }

  const handleMove = (index: number, offset: number) => {
    setRows((current) => {
      const target = index + offset
      if (target < 0 || target >= current.length) return current
      const reordered = [...current]
      ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
      return reordered
    })
  }

  const handleRemove = (key: number) => {
    setRows((current) => current.filter((row) => row.key !== key))
  }

  const handleAdd = () => {
    setRows((current) => [...current, toRow({ title: "", timing: null, release_type: null })])
  }

  const handleSave = () => {
    saveMutation.mutate(
      rows
        .map(({ title, timing, release_type }) => ({
          title: title.trim(),
          timing: timing?.trim() || null,
          release_type,
        }))
        .filter((step) => step.title.length > 0),
    )
  }

  const isTitleTooLong = (row: StepRow) => row.title.trim().length > STEP_TITLE_MAX_LENGTH
  const isTimingTooLong = (row: StepRow) => (row.timing?.trim().length ?? 0) > STEP_TIMING_MAX_LENGTH
  const hasInvalidRow = rows.some((row) => isTitleTooLong(row) || isTimingTooLong(row))

  if (isLoading) return <CircularProgress />

  if (error) {
    return <Alert severity="error">{handleError(error).message}</Alert>
  }

  return (
    <>
      <Typography variant="h2">Release steps</Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        Copied into each new release as its checklist. Changes do not affect existing releases. Steps support **bold**,
        *italic* and - lists.
      </Typography>
      <Box display="flex" flexDirection="column" gap={3} sx={{ mt: 2, maxWidth: 800 }}>
        {rows.length === 0 && <Typography color="text.secondary">No steps yet.</Typography>}
        {rows.map((row, index) => (
          <Stack key={row.key} direction="row" spacing={1} alignItems="flex-start">
            <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
              <TextField
                label={`Step ${index + 1}`}
                value={row.title}
                onChange={(event) => updateRow(row.key, { title: event.target.value })}
                error={isTitleTooLong(row)}
                helperText={
                  isTitleTooLong(row) ? `Step must be ${STEP_TITLE_MAX_LENGTH} characters or less` : undefined
                }
                size="small"
                multiline
                minRows={1}
                fullWidth
              />
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <TextField
                  label="When"
                  placeholder="e.g. 3 days before release"
                  value={row.timing ?? ""}
                  onChange={(event) => updateRow(row.key, { timing: event.target.value })}
                  error={isTimingTooLong(row)}
                  helperText={isTimingTooLong(row) ? `Must be ${STEP_TIMING_MAX_LENGTH} characters or less` : undefined}
                  size="small"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel id={`step-type-${row.key}`}>Applies to</InputLabel>
                  <Select
                    labelId={`step-type-${row.key}`}
                    label="Applies to"
                    value={row.release_type ?? ALL_TYPES}
                    onChange={(event) =>
                      updateRow(row.key, {
                        release_type: event.target.value === ALL_TYPES ? null : (event.target.value as ReleaseType),
                      })
                    }
                  >
                    <MenuItem value={ALL_TYPES}>All types</MenuItem>
                    {(Object.keys(releaseTypeLabels) as ReleaseType[]).map((type) => (
                      <MenuItem key={type} value={type}>
                        {releaseTypeLabels[type]}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Stack>
            <IconButton
              aria-label={`Move step ${index + 1} up`}
              onClick={() => handleMove(index, -1)}
              disabled={index === 0}
            >
              <ArrowUpwardIcon />
            </IconButton>
            <IconButton
              aria-label={`Move step ${index + 1} down`}
              onClick={() => handleMove(index, 1)}
              disabled={index === rows.length - 1}
            >
              <ArrowDownwardIcon />
            </IconButton>
            <IconButton aria-label={`Remove step ${index + 1}`} onClick={() => handleRemove(row.key)}>
              <DeleteIcon />
            </IconButton>
          </Stack>
        ))}
        <Button startIcon={<AddIcon />} onClick={handleAdd} sx={{ alignSelf: "flex-start" }}>
          Add step
        </Button>
        {saveMutation.isError && <Alert severity="error">{handleError(saveMutation.error).message}</Alert>}
        {saveMutation.isSuccess && <Alert severity="success">Saved.</Alert>}
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={saveMutation.isPending || hasInvalidRow}
          startIcon={saveMutation.isPending ? <CircularProgress size={16} /> : undefined}
          sx={{ alignSelf: "flex-start" }}
        >
          Save steps
        </Button>
      </Box>
    </>
  )
}
