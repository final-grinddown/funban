import { ChangeEvent, ReactNode, useMemo, useState } from "react"
import EmailIcon from "@mui/icons-material/Email"
import RestartAltIcon from "@mui/icons-material/RestartAlt"
import { Alert, Box, Button, Grid, Paper, Stack, TextField, Typography } from "@mui/material"
import { format } from "date-fns"
import Link from "next/link"
import { CopyButton } from "@/components/CopyButton"
import { useReleaseSettings } from "@/hooks/useReleaseSettings"
import { ERoutes } from "@/utils/enums"
import { handleError } from "@/utils/errorHandler"
import { Release } from "@/utils/interfaces"
import {
  buildEmail,
  buildMailtoHref,
  buildNotificationSql,
  buildTeamsMessage,
  buildTitlePreview,
  defaultNotificationParams,
  NotificationParams,
  validateNotificationParams,
} from "@/utils/releaseNotifications"

interface Props {
  release: Release
}

interface FieldConfig {
  name: keyof NotificationParams
  label: string
  type?: "datetime-local" | "number"
  size: number
  helperText?: string
}

const fields: FieldConfig[] = [
  { name: "maintenanceFrom", label: "Start", type: "datetime-local", size: 4 },
  { name: "systemsBackAt", label: "All systems back at", type: "datetime-local", size: 4 },
  { name: "code", label: "Notification type code", size: 4 },
  { name: "safetyDuration", label: "Safety duration (min)", type: "number", size: 4, helperText: "Users stop earlier" },
  { name: "durationInMinutes", label: "Duration (min)", type: "number", size: 4 },
  { name: "notifyInAdvanceDays", label: "Notify in advance (days)", type: "number", size: 4 },
  { name: "titleEN", label: "Title EN", size: 12, helperText: "Placeholders: {date}, {from}, {to}" },
  { name: "titleCS", label: "Title CS", size: 12 },
  { name: "linkToDetail", label: "Link to detail", size: 12, helperText: "Empty means NULL" },
]

const preSx = {
  m: 0,
  p: 2,
  bgcolor: "action.hover",
  borderRadius: 1,
  overflowX: "auto",
  fontSize: "0.8rem",
} as const

const textSx = { ...preSx, whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: "0.9rem" } as const

/**
 * Pre-filled notification texts for the release (system notification SQL, Teams, email) ready to copy
 */
export function ReleaseNotifications({ release }: Props) {
  const [params, setParams] = useState<NotificationParams>(() => defaultNotificationParams(release))
  const { data: settings, error: settingsError } = useReleaseSettings()

  const errors = validateNotificationParams(params)
  const hasErrors = Object.keys(errors).length > 0

  const sql = useMemo(() => buildNotificationSql(params), [params])
  const preview = useMemo(() => buildTitlePreview(params), [params])
  const teams = useMemo(() => buildTeamsMessage(params, release.release_type), [params, release.release_type])
  const email = useMemo(() => buildEmail(params, release.release_type), [params, release.release_type])

  const handleChange = (name: keyof NotificationParams) => (event: ChangeEvent<HTMLInputElement>) => {
    setParams((current) => ({ ...current, [name]: event.target.value }))
  }

  const handleReset = () => {
    setParams(defaultNotificationParams(release))
  }

  const handleOpenMailClient = () => {
    // Copy the body in the same click, the mail client opens with recipients and subject only
    if (email) navigator.clipboard.writeText(email.body).catch(() => undefined)
  }

  const to = settings?.notification_to ?? []
  const cc = settings?.notification_cc ?? []

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
        <Typography variant="h2" component="h2">
          Notifications
        </Typography>
        <Button startIcon={<RestartAltIcon />} onClick={handleReset}>
          Reset to defaults
        </Button>
      </Box>

      <Paper elevation={6} sx={{ mt: 2, p: 3 }}>
        <Typography variant="h3" component="h3" sx={{ mb: 2 }}>
          Parameters
        </Typography>
        <Grid container spacing={2}>
          {fields.map((field) => (
            <Grid key={field.name} size={{ xs: 12, sm: field.size }}>
              <TextField
                label={field.label}
                type={field.type ?? "text"}
                value={params[field.name]}
                onChange={handleChange(field.name)}
                error={!!errors[field.name]}
                helperText={errors[field.name] ?? field.helperText}
                size="small"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
          ))}
        </Grid>
        {hasErrors && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Fix the parameters above to generate the notifications.
          </Alert>
        )}
      </Paper>

      <NotificationCard title="Application notification (SQL)" action={<CopyButton text={sql} label="Copy SQL" />}>
        {preview && (
          <Box
            component="dl"
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "140px 1fr" },
              rowGap: 1,
              columnGap: 2,
              m: 0,
              mb: 2,
              "& dt": { color: "text.secondary", fontWeight: "bold" },
              "& dd": { m: 0 },
            }}
          >
            <dt>Title EN</dt>
            <dd>{preview.titleEN}</dd>
            <dt>Title CS</dt>
            <dd>{preview.titleCS}</dd>
            <dt>Valid</dt>
            <dd>
              {formatDate(preview.validFrom)} – {formatDate(preview.validTo)}
            </dd>
            <dt>Shown from</dt>
            <dd>{format(preview.notifyFrom, "d MMM yyyy")}</dd>
          </Box>
        )}
        {sql && (
          <Box component="pre" sx={preSx}>
            {sql}
          </Box>
        )}
      </NotificationCard>

      <NotificationCard title="Teams" action={<CopyButton text={teams} />}>
        {teams && (
          <Box component="pre" sx={textSx}>
            {teams}
          </Box>
        )}
      </NotificationCard>

      <NotificationCard
        title="Email"
        action={
          <Button
            size="small"
            variant="contained"
            startIcon={<EmailIcon />}
            component="a"
            href={email && to.length > 0 ? buildMailtoHref(to, cc, email.subject) : undefined}
            onClick={handleOpenMailClient}
            disabled={!email || to.length === 0}
          >
            Open in mail client
          </Button>
        }
      >
        {settingsError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to load recipients: {handleError(settingsError).message}
          </Alert>
        )}
        {settings && to.length === 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            No recipients set. Add them in <Link href={`${ERoutes.Settings}#releases`}>Settings</Link>.
          </Alert>
        )}
        {!hasErrors && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Opening the mail client also copies the body, just paste it into the email.
          </Typography>
        )}
        <Stack spacing={1.5}>
          <EmailField label="To" value={to.join("; ")} />
          <EmailField label="CC" value={cc.join("; ")} />
          <EmailField label="Subject" value={email?.subject ?? null} />
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography sx={{ color: "text.secondary", fontWeight: "bold" }}>Body</Typography>
            <CopyButton text={email?.body ?? null} label="Copy body" />
          </Box>
          {email && (
            <Box component="pre" sx={textSx}>
              {email.body}
            </Box>
          )}
        </Stack>
      </NotificationCard>
    </Box>
  )
}

function NotificationCard({ title, action, children }: { title: string; action: ReactNode; children: ReactNode }) {
  return (
    <Paper elevation={6} sx={{ mt: 2, p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, mb: 2 }}>
        <Typography variant="h3" component="h3">
          {title}
        </Typography>
        {action}
      </Box>
      {children}
    </Paper>
  )
}

function EmailField({ label, value }: { label: string; value: string | null }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "80px 1fr auto", gap: 2, alignItems: "center" }}>
      <Typography sx={{ color: "text.secondary", fontWeight: "bold" }}>{label}</Typography>
      <Typography sx={{ wordBreak: "break-word" }}>{value || "—"}</Typography>
      <CopyButton text={value || null} />
    </Box>
  )
}

function formatDate(date: Date): string {
  return format(date, "d MMM yyyy, HH:mm")
}
