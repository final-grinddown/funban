"use client"
import { SyntheticEvent, useMemo, useState } from "react"
import AccountCircleIcon from "@mui/icons-material/AccountCircle"
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
  FormControl,
  Select,
  InputLabel,
  SelectChangeEvent,
} from "@mui/material"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { fetchHistoryItem, fetchHistoryItemLast } from "@/app/api/fetches"
import { BackdropLoading } from "@/components/BackdropLoading"
import { Board } from "@/components/Board"
import { ERoutes } from "@/utils/enums"
import { base64DecodeUnicode, normalizeNotes } from "@/utils/helpers"
import { IExtendedSession, IHistoryItem } from "@/utils/interfaces"

export function HistoryDetailScreen({ id }: { id?: string }) {
  const { data: session } = useSession() as { data: IExtendedSession }
  const queryClient = useQueryClient()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const openMenu = Boolean(anchorEl)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery<IHistoryItem>({
    queryKey: ["historyItem", id ?? "last"],
    queryFn: () => (id ? fetchHistoryItem(id, session?.accessToken) : fetchHistoryItemLast(session?.accessToken)),
    enabled: !!session?.accessToken,
  })

  const notes = useMemo(() => {
    if (!data?.snapshot) return []

    const parsedSnapshot = JSON.parse(base64DecodeUnicode(data.snapshot))

    return normalizeNotes(parsedSnapshot)
  }, [data?.snapshot])

  const users = useMemo(() => {
    // Add the name and id of each owner of note to the set, remove duplicates, order by id
    const users = new Set<string>()
    users.add("All")
    notes.map((note) => note.name).forEach((user) => users.add(user))

    return Array.from(users)
  }, [notes])

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

  const handleUserChange: (event: SelectChangeEvent) => void = (event) => {
    setSelectedUser(event.target.value === "All" ? null : event.target.value)
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
      <FormControl sx={{ maxWidth: { sm: 220 }, marginTop: 2 }} size="small" fullWidth>
        <InputLabel id="select-current-user">Choose visible user</InputLabel>
        <Select
          labelId="select-current-user"
          value={selectedUser ?? "All"}
          label="Choose current user"
          onChange={handleUserChange}
          startAdornment={<AccountCircleIcon sx={{ marginRight: 1 }} />}
        >
          {users.map((user) => (
            <MenuItem key={user} value={user}>
              {user}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Board
        notes={notes}
        isEditable={false}
        isAnyModalOpen={false}
        setIsAnyModalOpen={() => {}}
        isFocus={selectedUser != null}
        currentUser={selectedUser ?? ""}
      />
    </Box>
  )
}
