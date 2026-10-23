"use client"
import { useCallback, useState } from "react"
import AddIcon from "@mui/icons-material/Add"
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from "@mui/material"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { Session } from "next-auth"
import { useSession } from "next-auth/react"
import { createRelease, fetchRelease, fetchReleases } from "@/app/api/fetches"
import { BackdropLoading } from "@/components/BackdropLoading"
import { ReleaseAssignee } from "@/components/ReleaseAssignee"
import { ReleaseFormModal } from "@/components/ReleaseFormModal"
import { ReleaseStatusChip } from "@/components/ReleaseStatusChip"
import { useConfig } from "@/context/ConfigProvider"
import { useModalSubmission } from "@/hooks/useModalSubmission"
import { useTeamMembers } from "@/hooks/useTeamMembers"
import { ERoutes } from "@/utils/enums"
import { handleError } from "@/utils/errorHandler"
import { ReleaseInsert } from "@/utils/interfaces"
import { deploymentLabel, formatReleaseAt, releaseTypeColors, releaseTypeLabels } from "@/utils/release"

export function ReleasesScreen() {
  const theme = useTheme()
  const router = useRouter()
  const { apiUrl } = useConfig()
  const queryClient = useQueryClient()
  const { data: session } = useSession() as { data: Session }
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ["releases"],
    queryFn: () => fetchReleases(apiUrl, session?.accessToken),
    enabled: !!session?.accessToken,
  })
  const { data: users = [] } = useTeamMembers()

  const createMutation = useMutation({
    mutationFn: (release: ReleaseInsert) => createRelease(apiUrl, release, session?.accessToken),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["releases"] }),
  })

  const handleCloseCreate = useCallback(() => setIsCreateOpen(false), [])
  const { isSubmitting, setIsSubmitting } = useModalSubmission(
    createMutation.isPending,
    handleCloseCreate,
    !createMutation.isError,
  )

  const handleOpenCreate = () => {
    createMutation.reset()
    setIsCreateOpen(true)
  }

  const handleCreate = (release: ReleaseInsert) => {
    setIsSubmitting(true)
    createMutation.mutate(release)
  }

  const handleMouseEnter = (id: string) => {
    queryClient.prefetchQuery({
      queryKey: ["release", id],
      queryFn: () => fetchRelease(apiUrl, id, session?.accessToken),
    })
  }

  if (isLoading) return <BackdropLoading isInDashboard={true} />

  if (error instanceof Error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        <AlertTitle>Error</AlertTitle>
        {error.message}
      </Alert>
    )
  }

  const headerCellSx = {
    fontWeight: "bold",
    fontSize: "1.2rem",
    color: theme.palette.primary.contrastText,
  }

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
        <Typography variant="h1" component="h1">
          Releases
        </Typography>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleOpenCreate}>
          New release
        </Button>
      </Box>

      {data && data.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          No releases yet. Create the first one with the &quot;New release&quot; button.
        </Alert>
      ) : (
        <TableContainer component={Paper} elevation={6} sx={{ marginTop: 2, overflowX: "auto" }}>
          <Table sx={{ minWidth: 800, backgroundColor: theme.palette.background.paper }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: theme.palette.primary.main }}>
                <TableCell sx={headerCellSx}>Code</TableCell>
                <TableCell sx={headerCellSx}>Type</TableCell>
                <TableCell sx={headerCellSx}>Deployment</TableCell>
                <TableCell sx={headerCellSx}>Date & time</TableCell>
                <TableCell sx={headerCellSx}>Assignee</TableCell>
                <TableCell sx={headerCellSx}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.map((release, index) => (
                <TableRow
                  key={release.id}
                  sx={{
                    cursor: "pointer",
                    backgroundColor: index % 2 === 0 ? "inherit" : "rgba(0, 0, 0, 0.15)",
                    "&:hover": {
                      backgroundColor: theme.palette.action.hover,
                    },
                    "&:last-child td, &:last-child th": {
                      border: 0,
                    },
                  }}
                  onMouseEnter={() => handleMouseEnter(release.id.toString())} // Prefetch on hover
                  onClick={() => router.push(`${ERoutes.Releases}/${release.id}`)}
                >
                  <TableCell>
                    <Typography fontWeight="bold">{release.release_code}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={releaseTypeLabels[release.release_type]}
                      color={releaseTypeColors[release.release_type]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{deploymentLabel(release.deployed_by_us)}</TableCell>
                  <TableCell>{formatReleaseAt(release.release_at)}</TableCell>
                  <TableCell>
                    <ReleaseAssignee release={release} />
                  </TableCell>
                  <TableCell>
                    <ReleaseStatusChip release={release} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <ReleaseFormModal
        isOpen={isCreateOpen}
        users={users}
        onClose={handleCloseCreate}
        onSave={handleCreate}
        isSubmitting={isSubmitting}
        errorMessage={createMutation.error ? handleError(createMutation.error).message : undefined}
      />
    </>
  )
}
