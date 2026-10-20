import AccountCircleIcon from "@mui/icons-material/AccountCircle"
import { MenuItem } from "@mui/material"
import type { SnapshotUser } from "@/utils/snapshot-types"

interface UserCardV1Props {
  user: SnapshotUser
  isSelected: boolean
  onSelect: () => void
}

export function UserCardV1({ user, isSelected, onSelect }: UserCardV1Props) {
  return (
    <MenuItem key={user.name} value={user.name} selected={isSelected} onClick={onSelect}>
      <AccountCircleIcon sx={{ marginRight: 1, color: user.color }} />
      {user.name}
    </MenuItem>
  )
}
