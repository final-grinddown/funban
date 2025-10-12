import { useMemo, useState } from "react"
import AccountCircleIcon from "@mui/icons-material/AccountCircle"
import {
  FormControl,
  Select,
  InputLabel,
  SelectChangeEvent,
  MenuItem,
} from "@mui/material"
import { Board } from "@/components/Board"
import type { ParsedSnapshot } from "@/utils/snapshot-types"
import { SnapshotParserV1 } from "./SnapshotParserV1"

interface HistoryV1Props {
  snapshot: string
}

export function HistoryV1({ snapshot }: HistoryV1Props) {
  const [selectedUser, setSelectedUser] = useState<string | null>(null)

  const { users, notes }: ParsedSnapshot = useMemo(() => {
    if (!snapshot) return { users: [], notes: [] }
    return SnapshotParserV1.parse(snapshot)
  }, [snapshot])

  const userNames = useMemo(() => {
    const names = ["All"]
    users.forEach(user => names.push(user.name))
    return names
  }, [users])

  const handleUserChange: (event: SelectChangeEvent) => void = (event) => {
    setSelectedUser(event.target.value === "All" ? null : event.target.value)
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

  return (
    <>
      <FormControl sx={{ maxWidth: { sm: 220 }, marginTop: 2 }} size="small" fullWidth>
        <InputLabel id="select-current-user">Choose visible user</InputLabel>
        <Select
          labelId="select-current-user"
          value={selectedUser ?? "All"}
          label="Choose current user"
          onChange={handleUserChange}
          startAdornment={<AccountCircleIcon sx={{ marginRight: 1 }} />}
        >
          {userNames.map((userName) => (
            <MenuItem key={userName} value={userName}>
              {userName}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Board
        notes={boardNotes}
        isEditable={false}
        isAnyModalOpen={false}
        setIsAnyModalOpen={() => {}}
        isFocus={selectedUser != null}
        currentUser={selectedUser ?? ""}
      />
    </>
  )
}