import { useEffect, useState } from "react"
import { Alert, Box, Button, CircularProgress, TextField, Typography } from "@mui/material"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Session } from "next-auth"
import { useSession } from "next-auth/react"
import { updateReleaseSettings } from "@/app/api/fetches"
import { useConfig } from "@/context/ConfigProvider"
import { releaseSettingsQueryKey, useReleaseSettings } from "@/hooks/useReleaseSettings"
import { handleError } from "@/utils/errorHandler"
import { ReleaseSettings } from "@/utils/interfaces"

/** Splits on new lines, commas and semicolons so addresses pasted from Outlook work too */
export function parseEmailList(value: string): string[] {
  return value
    .split(/[\n,;]/)
    .map((email) => email.trim())
    .filter(Boolean)
}

export function ReleaseSettingsForm() {
  const { apiUrl } = useConfig()
  const { data: session } = useSession() as { data: Session }
  const queryClient = useQueryClient()
  const { data: settings, isLoading, error } = useReleaseSettings()
  const [to, setTo] = useState("")
  const [cc, setCc] = useState("")

  useEffect(() => {
    if (!settings) return
    setTo(settings.notification_to.join("\n"))
    setCc(settings.notification_cc.join("\n"))
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: (data: ReleaseSettings) => updateReleaseSettings(apiUrl, data, session?.accessToken),
    onSuccess: (updated) => queryClient.setQueryData(releaseSettingsQueryKey, updated),
  })

  const handleSave = () => {
    saveMutation.mutate({ notification_to: parseEmailList(to), notification_cc: parseEmailList(cc) })
  }

  if (isLoading) return <CircularProgress />

  if (error) {
    return <Alert severity="error">{handleError(error).message}</Alert>
  }

  return (
    <>
      <Typography variant="h2">Release notification email</Typography>
      <Box display="flex" flexDirection="column" gap={2} sx={{ mt: 2, maxWidth: 500 }}>
        <TextField
          label="To"
          multiline
          minRows={2}
          value={to}
          onChange={(event) => setTo(event.target.value)}
          helperText="One email per line"
          size="small"
        />
        <TextField
          label="CC"
          multiline
          minRows={2}
          value={cc}
          onChange={(event) => setCc(event.target.value)}
          helperText="One email per line"
          size="small"
        />
        {saveMutation.isError && <Alert severity="error">{handleError(saveMutation.error).message}</Alert>}
        {saveMutation.isSuccess && <Alert severity="success">Saved.</Alert>}
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={saveMutation.isPending}
          startIcon={saveMutation.isPending ? <CircularProgress size={16} /> : undefined}
          sx={{ alignSelf: "flex-start" }}
        >
          Save
        </Button>
      </Box>
    </>
  )
}
