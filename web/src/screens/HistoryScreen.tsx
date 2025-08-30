"use client"
import {
  Alert,
  AlertTitle,
  Button,
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
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { fetchHistory, fetchHistoryItem } from "@/app/api/fetches"
import { BackdropLoading } from "@/components/BackdropLoading"
import { ERoutes } from "@/utils/enums"
import { IExtendedSession } from "@/utils/interfaces"

export function HistoryScreen() {
  const theme = useTheme()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: session } = useSession() as { data: IExtendedSession }

  const { data, isLoading, error } = useQuery({
    queryKey: ["history"],
    queryFn: () => fetchHistory(session?.accessToken),
    enabled: !!session?.accessToken,
  })

  const handleMouseEnter = (id: string) => {
    queryClient.prefetchQuery({
      queryKey: ["historyItem", id],
      queryFn: () => fetchHistoryItem(id, session?.accessToken),
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

  return (
    <>
      <Typography variant="h1" component="h1">
        History Data
      </Typography>
      <TableContainer
        component={Paper}
        elevation={6}
        sx={{
          marginTop: 2,
          overflowX: "auto",
        }}
      >
        <Table
          sx={{
            minWidth: 800,
            backgroundColor: theme.palette.background.paper,
          }}
        >
          <TableHead>
            <TableRow
              sx={{
                backgroundColor: theme.palette.primary.main,
              }}
            >
              <TableCell
                sx={{
                  fontWeight: "bold",
                  fontSize: "1.2rem",
                  color: theme.palette.primary.contrastText,
                }}
              >
                ID
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: "bold",
                  fontSize: "1.2rem",
                  color: theme.palette.primary.contrastText,
                }}
              >
                Created At
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: "bold",
                  fontSize: "1.2rem",
                  color: theme.palette.primary.contrastText,
                }}
              >
                Label
              </TableCell>
              <TableCell align="right"></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.map(({ id, created_at, label }, index) => (
              <TableRow
                key={id}
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
                onMouseEnter={() => handleMouseEnter(id.toString())} // Prefetch on hover
                onClick={() => router.push(`${ERoutes.History}/${id}`)}
              >
                <TableCell>{id}</TableCell>
                <TableCell>{new Date(created_at).toLocaleString()}</TableCell>
                <TableCell>
                  <Typography fontWeight="bold">{label}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={(e) => {
                      e.stopPropagation() // Prevent the row click event
                      router.push(`${ERoutes.History}/${id}`)
                    }}
                  >
                    View Snapshot Detail
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  )
}
