import AddIcon from "@mui/icons-material/Add"
import CenterFocusWeakIcon from "@mui/icons-material/CenterFocusWeak"
import CheckIcon from "@mui/icons-material/Check"
import { ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material"

interface BoardActionsMenuProps {
  anchorEl: HTMLElement | null
  openMenu: boolean
  onClose: () => void
  onStartFocus: () => void
  onOpenAddNewNoteModal: () => void
  onOpenEndStatusModal: () => void
}

export function BoardActionsMenu({
  anchorEl,
  openMenu,
  onClose,
  onStartFocus,
  onOpenAddNewNoteModal,
  onOpenEndStatusModal,
}: BoardActionsMenuProps) {
  return (
    <Menu
      anchorEl={anchorEl}
      open={openMenu}
      onClose={onClose}
      MenuListProps={{
        "aria-labelledby": "open board actions menu",
      }}
    >
      <MenuItem
        onClick={() => {
          onOpenAddNewNoteModal()
          onClose()
        }}
      >
        <ListItemIcon>
          <AddIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Create a new note</ListItemText>
      </MenuItem>
      <MenuItem
        onClick={() => {
          onStartFocus()
          onClose()
        }}
      >
        <ListItemIcon>
          <CenterFocusWeakIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Start focus</ListItemText>
      </MenuItem>
      <MenuItem
        onClick={() => {
          onOpenEndStatusModal()
          onClose()
        }}
      >
        <ListItemIcon>
          <CheckIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>End status</ListItemText>
      </MenuItem>
    </Menu>
  )
}
