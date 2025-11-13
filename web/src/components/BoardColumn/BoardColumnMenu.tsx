import { memo } from "react"
import AddIcon from "@mui/icons-material/Add"
import { Menu, MenuItem, ListItemText, ListItemIcon } from "@mui/material"

interface Props {
  anchorEl: HTMLElement | null
  open: boolean
  title: string
  isFocus: boolean
  selectedUserId: number | null
  onClose: () => void
  onAddNote: () => void
  onDeleteAllNotes: () => void
  onDeleteAllUserNotes: () => void
}

/**
 * Context menu for board column actions.
 * Provides options to add notes, delete all notes, or delete all notes for a specific user.
 *
 * Memoized to prevent re-renders when menu is closed or props haven't changed.
 */
export const BoardColumnMenu = memo(function BoardColumnMenu({
  anchorEl,
  open,
  title,
  isFocus,
  selectedUserId,
  onClose,
  onAddNote,
  onDeleteAllNotes,
  onDeleteAllUserNotes,
}: Props) {
  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      MenuListProps={{
        "aria-labelledby": "open edit note menu",
      }}
    >
      <MenuItem onClick={onAddNote}>
        <ListItemIcon>
          <AddIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Add new note</ListItemText>
      </MenuItem>

      {isFocus && selectedUserId && (
        <MenuItem onClick={onDeleteAllUserNotes}>
          <ListItemIcon>
            <AddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete all {title} for user</ListItemText>
        </MenuItem>
      )}

      {!isFocus && (
        <MenuItem onClick={onDeleteAllNotes}>
          <ListItemIcon>
            <AddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete all {title}</ListItemText>
        </MenuItem>
      )}
    </Menu>
  )
})
