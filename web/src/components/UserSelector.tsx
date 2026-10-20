import AccountCircleIcon from "@mui/icons-material/AccountCircle"
import { Box, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from "@mui/material"
import { User } from "@/utils/interfaces"

interface UserSelectorProps {
  users: User[]
  selectedUser: string
  onChange: (event: SelectChangeEvent) => void
}

export function UserSelector({ users, selectedUser, onChange }: UserSelectorProps) {
  return (
    <FormControl sx={{ maxWidth: { sm: 300 } }} size="small" fullWidth>
      <InputLabel id="select-current-user">Choose current user</InputLabel>
      <Select
        labelId="select-current-user"
        value={selectedUser}
        label="Choose current user"
        onChange={onChange}
        startAdornment={<AccountCircleIcon sx={{ marginRight: 1 }} />}
      >
        {users.map((user) => {
          const marksDisplay = user.marks.map((m) => m.mark_type).join(" ")
          return (
            <MenuItem key={user.id} value={user.id}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                <span>{user.name}</span>
                {marksDisplay && <span style={{ marginLeft: "auto", fontSize: "1rem" }}>{marksDisplay}</span>}
              </Box>
            </MenuItem>
          )
        })}
      </Select>
    </FormControl>
  )
}
