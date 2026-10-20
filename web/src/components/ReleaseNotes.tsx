import { useState } from "react"
import EditIcon from "@mui/icons-material/Edit"
import SaveIcon from "@mui/icons-material/Save"
import { Alert, Box, Button, CircularProgress, Paper, Stack, TextField, Typography } from "@mui/material"
import { NoteText } from "@/components/NoteText"
import { handleError } from "@/utils/errorHandler"

interface Props {
  notes: string | null
  /** Closed releases show the notes without the edit action */
  isReadOnly: boolean
  onSave: (notes: string) => Promise<unknown>
}

const RELEASE_NOTES_MAX_LENGTH = 20000

/**
 * Markdown notes of the release, rendered by default and edited in place
 */
export function ReleaseNotes({ notes, isReadOnly, onSave }: Props) {
  const [draft, setDraft] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isEditing = draft !== null
  const isTooLong = (draft?.length ?? 0) > RELEASE_NOTES_MAX_LENGTH

  // Closed releases without notes have nothing to show
  if (isReadOnly && !notes) return null

  const handleEdit = () => {
    setErrorMessage(null)
    setDraft(notes ?? "")
  }

  const handleCancel = () => {
    setErrorMessage(null)
    setDraft(null)
  }

  const handleSave = async () => {
    if (draft === null) return
    setIsSaving(true)
    setErrorMessage(null)
    try {
      await onSave(draft)
      setDraft(null)
    } catch (error) {
      setErrorMessage(handleError(error).message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
        <Typography variant="h2" component="h2">
          Notes
        </Typography>
        {!isReadOnly && !isEditing && (
          <Button startIcon={<EditIcon />} onClick={handleEdit}>
            Edit notes
          </Button>
        )}
      </Box>

      <Paper elevation={6} sx={{ mt: 2, p: 3 }}>
        {isEditing ? (
          <>
            <TextField
              label="Notes"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              multiline
              minRows={6}
              fullWidth
              autoFocus
              disabled={isSaving}
              error={isTooLong}
              helperText={
                isTooLong
                  ? `Notes must be ${RELEASE_NOTES_MAX_LENGTH} characters or less`
                  : "Supports **bold**, *italic* and - lists"
              }
            />
            {errorMessage && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {errorMessage}
              </Alert>
            )}
            <Stack direction="row" spacing={1} sx={{ mt: 2, justifyContent: "flex-end" }}>
              <Button onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                variant="contained"
                startIcon={isSaving ? <CircularProgress size={16} /> : <SaveIcon />}
                onClick={handleSave}
                disabled={isSaving || isTooLong}
              >
                Save
              </Button>
            </Stack>
          </>
        ) : notes ? (
          <NoteText text={notes} />
        ) : (
          <Typography color="text.secondary">No notes yet.</Typography>
        )}
      </Paper>
    </Box>
  )
}
