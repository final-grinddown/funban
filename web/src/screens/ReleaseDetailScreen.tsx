"use client"
import { useCallback, useState } from "react"
import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import DeleteIcon from "@mui/icons-material/Delete"
import EditIcon from "@mui/icons-material/Edit"
import LockIcon from "@mui/icons-material/Lock"
import LockOpenIcon from "@mui/icons-material/LockOpen"
import { Alert, AlertTitle, Box, Button, Chip, CircularProgress, Paper, Stack, Typography } from "@mui/material"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Session } from "next-auth"
import { useSession } from "next-auth/react"
import {
  addReleaseTasksFromTemplate,
  closeRelease,
  deleteRelease,
  fetchRelease,
  reopenRelease,
  updateRelease,
  updateReleaseNotes,
  updateReleaseTask,
} from "@/app/api/fetches"
import { BackdropLoading } from "@/components/BackdropLoading"
import { CloseReleaseModal } from "@/components/CloseReleaseModal"
import { DeleteReleaseModal } from "@/components/DeleteReleaseModal"
import { ReleaseAssignee } from "@/components/ReleaseAssignee"
import { ReleaseChecklist } from "@/components/ReleaseChecklist"
import { ReleaseFormModal } from "@/components/ReleaseFormModal"
import { ReleaseNotes } from "@/components/ReleaseNotes"
import { ReleaseNotifications } from "@/components/ReleaseNotifications"
import { ReleaseStatusChip } from "@/components/ReleaseStatusChip"
import { useConfig } from "@/context/ConfigProvider"
import { useModalSubmission } from "@/hooks/useModalSubmission"
import { useTeamMembers } from "@/hooks/useTeamMembers"
import { ERoutes } from "@/utils/enums"
import { handleError } from "@/utils/errorHandler"
import { Release, ReleaseInsert } from "@/utils/interfaces"
import { formatReleaseAt, releaseTypeColors, releaseTypeLabels } from "@/utils/release"

interface Props {
  id: string
}

export function ReleaseDetailScreen({ id }: Props) {
  const router = useRouter()
  const { apiUrl } = useConfig()
  const queryClient = useQueryClient()
  const { data: session } = useSession() as { data: Session }
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isCloseOpen, setIsCloseOpen] = useState(false)

  const {
    data: release,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["release", id],
    queryFn: () => fetchRelease(apiUrl, id, session?.accessToken),
    enabled: !!session?.accessToken,
  })
  const { data: users = [] } = useTeamMembers()

  const handleReleaseChanged = (updated: Release) => {
    queryClient.setQueryData(["release", id], updated)
    queryClient.invalidateQueries({ queryKey: ["releases"] })
  }

  const updateMutation = useMutation({
    mutationFn: (data: ReleaseInsert) => updateRelease(apiUrl, Number(id), data, session?.accessToken),
    onSuccess: handleReleaseChanged,
  })

  const closeMutation = useMutation({
    mutationFn: (summary: string) => closeRelease(apiUrl, Number(id), summary, session?.accessToken),
    onSuccess: handleReleaseChanged,
  })

  const notesMutation = useMutation({
    mutationFn: (notes: string) => updateReleaseNotes(apiUrl, Number(id), notes, session?.accessToken),
    onSuccess: handleReleaseChanged,
  })

  const taskMutation = useMutation({
    mutationFn: ({ taskId, done }: { taskId: number; done: boolean }) =>
      updateReleaseTask(apiUrl, Number(id), taskId, done, session?.accessToken),
    onSuccess: handleReleaseChanged,
  })

  const tasksFromTemplateMutation = useMutation({
    mutationFn: () => addReleaseTasksFromTemplate(apiUrl, Number(id), session?.accessToken),
    onSuccess: handleReleaseChanged,
  })

  const reopenMutation = useMutation({
    mutationFn: () => reopenRelease(apiUrl, Number(id), session?.accessToken),
    onSuccess: handleReleaseChanged,
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteRelease(apiUrl, Number(id), session?.accessToken),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["release", id] })
      queryClient.invalidateQueries({ queryKey: ["releases"] })
      router.push(ERoutes.Releases)
    },
    onError: () => setIsDeleteOpen(false),
  })

  const handleCloseEdit = useCallback(() => setIsEditOpen(false), [])
  const { isSubmitting: isSaving, setIsSubmitting: setIsSaving } = useModalSubmission(
    updateMutation.isPending,
    handleCloseEdit,
    !updateMutation.isError,
  )

  const handleCloseCloseModal = useCallback(() => setIsCloseOpen(false), [])
  const { isSubmitting: isClosing, setIsSubmitting: setIsClosing } = useModalSubmission(
    closeMutation.isPending,
    handleCloseCloseModal,
    !closeMutation.isError,
  )

  const handleOpenEdit = () => {
    updateMutation.reset()
    setIsEditOpen(true)
  }

  const handleSave = (data: ReleaseInsert) => {
    setIsSaving(true)
    updateMutation.mutate(data)
  }

  const handleOpenClose = () => {
    closeMutation.reset()
    setIsCloseOpen(true)
  }

  const handleConfirmClose = (summary: string) => {
    setIsClosing(true)
    closeMutation.mutate(summary)
  }

  const handleReopen = () => {
    reopenMutation.mutate()
  }

  const handleDelete = () => {
    deleteMutation.mutate()
  }

  const handleToggleTask = (taskId: number, done: boolean) => taskMutation.mutateAsync({ taskId, done })

  if (isLoading) return <BackdropLoading isInDashboard={true} />

  if (error instanceof Error || !release) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        <AlertTitle>Error</AlertTitle>
        {error instanceof Error ? error.message : "Release not found."}
      </Alert>
    )
  }

  const isClosed = !!release.closed_at
  const actionError = deleteMutation.error ?? reopenMutation.error

  return (
    <>
      <Button component={Link} href={ERoutes.Releases} startIcon={<ArrowBackIcon />} sx={{ mb: 1 }}>
        All releases
      </Button>

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h1" component="h1">
            Release {release.release_code}
          </Typography>
          <ReleaseStatusChip release={release} />
        </Stack>
        {isClosed ? (
          <Button
            variant="contained"
            color="primary"
            startIcon={reopenMutation.isPending ? <CircularProgress size={16} /> : <LockOpenIcon />}
            onClick={handleReopen}
            disabled={reopenMutation.isPending}
          >
            Reopen
          </Button>
        ) : (
          <Stack direction="row" spacing={1}>
            <Button variant="contained" color="primary" startIcon={<EditIcon />} onClick={handleOpenEdit}>
              Edit
            </Button>
            <Button variant="contained" color="success" startIcon={<LockIcon />} onClick={handleOpenClose}>
              Close
            </Button>
            <Button variant="contained" color="error" startIcon={<DeleteIcon />} onClick={() => setIsDeleteOpen(true)}>
              Delete
            </Button>
          </Stack>
        )}
      </Box>

      {actionError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {handleError(actionError).message}
        </Alert>
      )}

      <Paper elevation={6} sx={{ mt: 2, p: 3 }}>
        <Box
          component="dl"
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "200px 1fr" },
            rowGap: 2,
            columnGap: 3,
            m: 0,
            "& dt": { color: "text.secondary", fontWeight: "bold" },
            "& dd": { m: 0 },
          }}
        >
          <dt>Type</dt>
          <dd>
            <Chip
              label={releaseTypeLabels[release.release_type]}
              color={releaseTypeColors[release.release_type]}
              size="small"
            />
          </dd>
          <dt>Date & time</dt>
          <dd>{formatReleaseAt(release.release_at)}</dd>
          <dt>Assigned developer</dt>
          <dd>
            <ReleaseAssignee release={release} />
          </dd>
          {release.closed_at && (
            <>
              <dt>Closed at</dt>
              <dd>{formatReleaseAt(release.closed_at)}</dd>
              <dt>Summary</dt>
              <Typography component="dd" sx={{ whiteSpace: "pre-wrap" }}>
                {release.close_summary}
              </Typography>
            </>
          )}
        </Box>
      </Paper>

      <ReleaseChecklist
        tasks={release.tasks}
        isReadOnly={isClosed}
        onToggle={handleToggleTask}
        onAddFromTemplate={tasksFromTemplateMutation.mutateAsync}
      />

      <ReleaseNotes notes={release.notes} isReadOnly={isClosed} onSave={notesMutation.mutateAsync} />

      {/* Keyed so the defaults follow edits of the release date or type */}
      {!isClosed && (
        <ReleaseNotifications key={`${release.release_at}-${release.release_type}`} release={release} />
      )}

      <ReleaseFormModal
        isOpen={isEditOpen}
        release={release}
        users={users}
        onClose={handleCloseEdit}
        onSave={handleSave}
        isSubmitting={isSaving}
        errorMessage={updateMutation.error ? handleError(updateMutation.error).message : undefined}
      />

      <CloseReleaseModal
        isOpen={isCloseOpen}
        releaseCode={release.release_code}
        previousSummary={release.close_summary}
        unfinishedStepCount={release.tasks.filter((task) => !task.done_at).length}
        onClose={handleCloseCloseModal}
        onConfirm={handleConfirmClose}
        isSubmitting={isClosing}
        errorMessage={closeMutation.error ? handleError(closeMutation.error).message : undefined}
      />

      <DeleteReleaseModal
        isOpen={isDeleteOpen}
        releaseCode={release.release_code}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        isSubmitting={deleteMutation.isPending}
      />
    </>
  )
}
