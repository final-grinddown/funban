import { useEffect, useMemo, useState } from "react"
import AccountCircleIcon from "@mui/icons-material/AccountCircle"
import {
  FormControl,
  Select,
  InputLabel,
  SelectChangeEvent,
  MenuItem,
  Box,
} from "@mui/material"
import { Board } from "@/components/Board"
import { useAppStore } from "@/store"
import type { ParsedSnapshot } from "@/utils/snapshot-types"
import { SnapshotParserV2 } from "./SnapshotParserV2"

interface HistoryV2Props {
  snapshot: string
}

export function HistoryV2({ snapshot }: HistoryV2Props) {
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const setNotes = useAppStore((state) => state.board.setNotes)
  const setIsFocus = useAppStore((state) => state.focus.setIsFocus)
  const setCurrentUser = useAppStore((state) => state.focus.setCurrentUser)

  const { users, notes }: ParsedSnapshot = useMemo(() => {
    if (!snapshot) return { users: [], notes: [] }
    return SnapshotParserV2.parse(snapshot)
  }, [snapshot])

  const handleUserChange: (event: SelectChangeEvent) => void = (event) => {
    const newUser = event.target.value === "All" ? null : event.target.value
    setSelectedUser(newUser)
    setIsFocus(newUser != null)
    setCurrentUser(newUser ?? "")
  }

  // Convert back to the format Board expects (with owner info embedded)
  const boardNotes = useMemo(() => {
    return notes.map(note => ({
      id: note.id,
      text: note.text,
      name: note.name,
      owner_id: note.owner_id,
      color: note.color,
      state: note.state as any, // Board expects specific enum types
      predecessor_id: note.predecessor_id,
      updated: note.updated,
      created: note.created,
      tag: note.tag as any, // Board expects specific enum types
    }))
  }, [notes])

  // Update store with historical data
  useEffect(() => {
    setNotes(boardNotes)
  }, [boardNotes, setNotes])

  return (
    <>
      {/* User filter with inline marks */}
      <FormControl sx={{ maxWidth: { sm: 300 }, marginTop: 2 }} size="small" fullWidth>
        <InputLabel id="select-current-user">Choose visible user</InputLabel>
        <Select
          labelId="select-current-user"
          value={selectedUser ?? "All"}
          label="Choose current user"
          onChange={handleUserChange}
          startAdornment={<AccountCircleIcon sx={{ marginRight: 1 }} />}
        >
          <MenuItem value="All">All</MenuItem>
          {users.map((user) => {
            const marksDisplay = user.marks.map(m => m.mark_type).join(' ')
            return (
              <MenuItem key={user.id} value={user.name}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  <span>{user.name}</span>
                  {marksDisplay && (
                    <span style={{ marginLeft: 'auto', fontSize: '1rem' }}>
                      {marksDisplay}
                    </span>
                  )}
                </Box>
              </MenuItem>
            )
          })}
        </Select>
      </FormControl>

      {/* Board */}
      <Board isEditable={false} />
    </>
  )
}
