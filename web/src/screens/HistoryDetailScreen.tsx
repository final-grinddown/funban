"use client"
import { SyntheticEvent, useState } from "react"
import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import ArrowForwardIcon from "@mui/icons-material/ArrowForward"
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft"
import LastPageIcon from "@mui/icons-material/LastPage"
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Link as MuiLink,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { Session } from "next-auth"
import { useSession } from "next-auth/react"
import { fetchHistoryItem, fetchHistoryItemLast } from "@/app/api/fetches"
import { BackdropLoading } from "@/components/BackdropLoading"
import { HistoryRenderer } from "@/components/history/HistoryRenderer"
import { ERoutes } from "@/utils/enums"
import { IHistoryItem } from "@/utils/interfaces"

export function HistoryDetailScreen({ id }: { id?: string }) {
  const { data: session } = useSession() as { data: Session }
  const queryClient = useQueryClient()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const openMenu = Boolean(anchorEl)

  const { data, isLoading, error } = useQuery<IHistoryItem>({
    queryKey: ["historyItem", id ?? "last"],
    queryFn: () => (id ? fetchHistoryItem(id, session?.accessToken) : fetchHistoryItemLast(session?.accessToken)),
    enabled: !!session?.accessToken,
  })

  const handleOpenMenu = (event: SyntheticEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }
  const handleCloseMenu = () => setAnchorEl(null)

  const handlePrefetchNext = async () => {
    if (data?.next?.id) {
      await queryClient.prefetchQuery({
        queryKey: ["historyItem", String(data.next.id)],
        queryFn: () => fetchHistoryItem(String(data.next.id), session?.accessToken),
      })
    }
  }

  const handlePrefetchPrevious = async () => {
    if (data?.previous?.id) {
      await queryClient.prefetchQuery({
        queryKey: ["historyItem", String(data.previous.id)],
        queryFn: () => fetchHistoryItem(String(data.previous.id), session?.accessToken),
      })
    }
  }

  const handlePrefetchLast = async () => {
    if (data?.next?.id) {
      await queryClient.prefetchQuery({
        queryKey: ["historyItem", "last"],
        queryFn: () => fetchHistoryItemLast(session?.accessToken),
      })
    }
  }

  if (isLoading) {
    return <BackdropLoading isInDashboard={true} />
  }

  if (error instanceof Error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        <AlertTitle>Error</AlertTitle>
        {error.message}
      </Alert>
    )
  }

  return (
    <Box>
      <Box mb={2} display="flex" justifyContent="space-between">
        <Button variant="outlined" component={Link} href={ERoutes.History} startIcon={<KeyboardArrowLeftIcon />}>
          Go back
        </Button>
        <Button variant="contained" sx={{ display: { md: "none" } }} onClick={handleOpenMenu}>
          Navigation
        </Button>
        <Menu
          anchorEl={anchorEl}
          open={openMenu}
          onClose={handleCloseMenu}
          MenuListProps={{
            "aria-labelledby": "open board actions menu",
          }}
        >
          <MenuItem onClick={handleCloseMenu} disabled={!data?.previous?.id}>
            <MuiLink
              component={Link}
              href={`${ERoutes.History}/${data?.previous?.id ?? ""}`}
              underline="none"
              color="inherit"
              sx={{ display: "flex" }}
            >
              <ListItemIcon>
                <ArrowBackIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Previous snapshot</ListItemText>
            </MuiLink>
          </MenuItem>
          <MenuItem onClick={handleCloseMenu} disabled={!data?.next?.id}>
            <MuiLink
              component={Link}
              href={`${ERoutes.History}/${data?.next?.id ?? ""}`}
              underline="none"
              color="inherit"
              sx={{ display: "flex" }}
            >
              <ListItemIcon>
                <ArrowForwardIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Next snapshot</ListItemText>
            </MuiLink>
          </MenuItem>
          <MenuItem onClick={handleCloseMenu} disabled={!data?.next?.id}>
            <MuiLink
              component={Link}
              href={`${ERoutes.History}/last`}
              underline="none"
              color="inherit"
              sx={{ display: "flex" }}
            >
              <ListItemIcon>
                <LastPageIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Last snapshot</ListItemText>
            </MuiLink>
          </MenuItem>
        </Menu>
        <Box display={{ xs: "none", md: "flex" }} gap={2}>
          <Button
            component={Link}
            href={`${ERoutes.History}/${data?.previous?.id ?? ""}`}
            color="inherit"
            variant="contained"
            startIcon={<ArrowBackIcon />}
            disabled={!data?.previous}
            onMouseEnter={handlePrefetchPrevious}
          >
            Previous snapshot
          </Button>
          <Button
            component={Link}
            href={`${ERoutes.History}/${data?.next?.id ?? ""}`}
            color="inherit"
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            disabled={!data?.next}
            onMouseEnter={handlePrefetchNext}
          >
            Next snapshot
          </Button>
          <Button
            component={Link}
            href={`${ERoutes.History}/last`}
            variant="contained"
            disabled={!data?.next}
            onMouseEnter={handlePrefetchLast}
          >
            Last snapshot
          </Button>
        </Box>
      </Box>
      <Typography variant="h1" component="h1">
        History Detail for: {data?.label}
      </Typography>
      {data?.snapshot && <HistoryRenderer snapshot={data.snapshot} version={data.version} />}
    </Box>
  )
}
