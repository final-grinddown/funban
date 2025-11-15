import { memo } from "react"
import AddLinkIcon from "@mui/icons-material/AddLink"
import CallSplitIcon from "@mui/icons-material/CallSplit"
import DeleteIcon from "@mui/icons-material/Delete"
import EditIcon from "@mui/icons-material/Edit"
import {
  Divider,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
} from "@mui/material"
import { useTheme } from "@mui/material/styles"
import { allowedModifiers } from "@/utils/noteConstants"

interface Props {
  open: boolean
  contextMenu: { mouseX: number; mouseY: number } | null
  tag: string | null
  onClose: () => void
  onEdit: () => void
  onSplit: () => void
  onDelete: () => void
  onClearModifier: () => void
  onSetModifier: (modifier: string) => void
}

/**
 * Context menu for note card actions.
 * Provides options to edit, split, delete notes, and manage modifiers.
 *
 * Memoized to prevent re-renders when menu is closed or props haven't changed.
 */
export const NoteCardMenu = memo(function NoteCardMenu({
  open,
  contextMenu,
  tag,
  onClose,
  onEdit,
  onSplit,
  onDelete,
  onClearModifier,
  onSetModifier,
}: Props) {
  const theme = useTheme()

  return (
    <Menu
      open={open}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={
        contextMenu !== null ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined
      }
      MenuListProps={{
        "aria-labelledby": "context-menu",
      }}
    >
      <MenuItem onClick={onEdit}>
        <ListItemIcon>
          <EditIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Edit note</ListItemText>
      </MenuItem>
      <MenuItem onClick={onSplit}>
        <ListItemIcon>
          <CallSplitIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Split note</ListItemText>
      </MenuItem>
      <Divider />
      <MenuItem onClick={onDelete}>
        <ListItemIcon>
          <DeleteIcon fontSize="small" color="error" />
        </ListItemIcon>
        <ListItemText sx={{ color: theme.palette.error.main }}>Delete note</ListItemText>
      </MenuItem>
      <Divider />
      <ListSubheader>Modifier</ListSubheader>
      {tag !== null && (
        <MenuItem onClick={onClearModifier}>
          <ListItemIcon>
            <AddLinkIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>None</ListItemText>
        </MenuItem>
      )}
      {allowedModifiers.map(
        (modifier) =>
          tag !== modifier && (
            <MenuItem key={modifier} onClick={() => onSetModifier(modifier)}>
              <ListItemIcon>
                <AddLinkIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>{modifier}</ListItemText>
            </MenuItem>
          ),
      )}
    </Menu>
  )
})
