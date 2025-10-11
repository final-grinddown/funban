import { DragEvent, useCallback, useEffect, useState } from "react"
import AddLinkIcon from "@mui/icons-material/AddLink"
import CallSplitIcon from "@mui/icons-material/CallSplit"
import DeleteIcon from "@mui/icons-material/Delete"
import EditIcon from "@mui/icons-material/Edit"
import {
  Card,
  CardContent,
  CardHeader,
  CardMedia,
  Divider,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material"
import { alpha, useTheme } from "@mui/material/styles"
import { createUpdateNoteTag } from "@/app/api/websocket"
import { useWebSocketContext } from "@/context/WebSocketProvider"
import { useSimpleModal } from "@/hooks/useSimpleModal"
import type { WsNoteTag } from "@/schemas/websocket"
import { availableColors } from "@/utils/constants"
import { formatDateToShow, matchColorName } from "@/utils/helpers"
import { DevSettings, Note } from "@/utils/interfaces"
import { getStoredDevIdsValue, getStoredDevPredecessorsValue } from "@/utils/storage"
import { useFocusStateStore } from "@/utils/store"
import { DeleteNoteModal } from "./DeleteNoteModal"
import { EditNoteModal } from "./EditNoteModal"
import { SplitNoteModal } from "./SplitNoteModal"

const HEADER_CONFIG_KEY = "funban-header-config"

interface Props extends Note {
  isEditable: boolean
  predecessor_id: number | null
  onDragStart: (event: DragEvent<HTMLDivElement>, itemId: string) => void
  onDragEnd: () => void
}

const allowedModifiers = ["Important", "Deadline", "Waiting", "Quick"]

const tagColor: Record<string, string> = {
  Important: "#f44336",
  Deadline: "#000000",
  Waiting: "#ff9800",
  Quick: "#4caf50",
}

export function BoardItemCard({
  text,
  name,
  color,
  state,
  updated,
  created,
  id,
  owner_id,
  isEditable,
  predecessor_id,
  tag,
  onDragStart,
  onDragEnd,
}: Props) {
  const { sendMessageAsync, isLoading, users } = useWebSocketContext()
  const { isFocus, currentUser } = useFocusStateStore()
  const theme = useTheme()
  // After migration, color should be a hex value, but fallback to color name matching for safety
  const matchedColor = color?.startsWith("#") ? color : (matchColorName(color || "Black", availableColors) || "#000000")
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
  } | null>(null)
  const editModal = useSimpleModal()
  const deleteModal = useSimpleModal()
  const splitModal = useSimpleModal()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [textFocus, setTextFocus] = useState(false)
  const openMenu = contextMenu !== null
  const contrastColor = theme.palette.getContrastText(matchedColor)
  const { updatedDate, createdDate, updatedRelative, createdRelative } = formatDateToShow(created, updated)
  const dateToShow =
    updated && updated !== created
      ? `Updated at ${isEditable ? updatedRelative : updatedDate}`
      : `Created at ${isEditable ? createdRelative : createdDate}`
  const headerConfig = localStorage.getItem(HEADER_CONFIG_KEY) || "updated_only"
  const devSettings: DevSettings = { ids: getStoredDevIdsValue(), predecessors: getStoredDevPredecessorsValue() }
  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setContextMenu({
      mouseX: event.clientX + 2,
      mouseY: event.clientY - 6,
    })

    if (isSubmitting) setIsSubmitting(false)
  }

  const handleCloseMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const handleEditModal = (focusText: boolean = false) => {
    setTextFocus(focusText)
    editModal.openModal()
    handleCloseMenu()
  }

  const handleEditOpenModal = () => handleEditModal()

  const handleEditDoubleClickOpenModal = () => handleEditModal(true)

  const handleClearTextFocus = () => {
    setTextFocus(false)
  }

  const handleEditCloseModal = () => {
    editModal.closeModal()
  }

  const handleClearModifier = () => {
    const message = createUpdateNoteTag(id.toString(), null)
    sendMessageAsync(message, "Modifier reset")
    setIsSubmitting(true)
    handleCloseMenu()
  }

  const handleSet = (modifier: string) => {
    const message = createUpdateNoteTag(id.toString(), modifier as WsNoteTag)
    sendMessageAsync(message, "Modifier set to " + modifier)
    setIsSubmitting(true)
    handleCloseMenu()
  }

  const handleDeleteOpenModal = () => {
    deleteModal.openModal()
    handleCloseMenu()
  }

  const handleSplitOpenModal = () => {
    splitModal.openModal()
    handleCloseMenu()
  }


  const handleDrag = (event: DragEvent<HTMLDivElement>, isStarting: boolean) => {
    if (isStarting) {
      onDragStart(event, id.toString())
      event.currentTarget.style.cursor = "grabbing"
    } else {
      onDragEnd()
      event.currentTarget.style.cursor = "grab"
    }
    setIsDragging(isStarting)
  }

  useEffect(() => {
    if (isSubmitting && !isLoading) {
      handleCloseMenu()
    }
  }, [handleCloseMenu, isLoading, isSubmitting])

  useEffect(() => {
    const handleGlobalContextMenu = (event: MouseEvent) => {
      if (openMenu && !(event.target as Element)?.closest('[data-context-menu-card]')) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    if (openMenu) {
      document.addEventListener('contextmenu', handleGlobalContextMenu, true)
    }

    return () => {
      document.removeEventListener('contextmenu', handleGlobalContextMenu, true)
    }
  }, [openMenu])

  return (
    <>
      <Card
        draggable={isEditable}
        onDragStart={(event) => handleDrag(event, true)}
        onDragEnd={(event) => handleDrag(event, false)}
        onContextMenu={isEditable ? handleContextMenu : undefined}
        data-context-menu-card={isEditable ? true : undefined}
        elevation={4}
        sx={{
          m: 2,
          opacity: isFocus && name !== currentUser ? 0.05 : 1,
          transition: "opacity 0.25s ease-out",
          cursor: isEditable ? "grab" : "default",
          border: tag !== null ? `2px solid ${alpha(tagColor[tag], 0.75)}` : "",
        }}
      >
        <CardHeader
          title={
            <Typography
              variant="h6"
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                color: alpha(contrastColor, 0.85),
              }}
            >
              {name} {devSettings.ids ? ` (${id})` : ""}
              {devSettings.predecessors ? ` (^${predecessor_id})` : ""}
            </Typography>
          }
          subheader={
            <>
              {headerConfig === "updated_only" && (
                <Typography variant="body2" sx={{ color: alpha(contrastColor, 0.7) }}>
                  {dateToShow}
                </Typography>
              )}
              {headerConfig === "created_updated" && (
                <>
                  <Typography variant="body2" sx={{ color: alpha(contrastColor, 0.7) }}>
                    {isEditable ? `Created ${createdRelative}` : `Created at ${createdDate}`}
                  </Typography>
                  {updated && (
                    <Typography variant="body2" sx={{ color: alpha(contrastColor, 0.7) }}>
                      {updated !== created
                        ? isEditable
                          ? `Updated ${updatedRelative}`
                          : `Updated at ${updatedDate}`
                        : "N/A"}
                    </Typography>
                  )}
                </>
              )}
            </>
          }
          action={null}
          sx={{
            bgcolor: alpha(matchedColor, 0.75),
          }}
        />
        <CardContent
          sx={{
            p: 2,
            position: "relative",
            transition: "background-color 0.3s ease-in-out",
            "&:hover": {
              cursor: isEditable && !isDragging ? "context-menu" : "default",
              bgcolor: isEditable && !isDragging ? alpha(theme.palette.primary.light, 0.15) : null,
              animation: isEditable && !isDragging ? "pulsate 1.5s ease-in-out infinite" : null, // Apply pulsating effect
            },
            "@keyframes pulsate": {
              "0%": { backgroundColor: alpha(theme.palette.primary.light, 0.15) },
              "50%": { backgroundColor: alpha(theme.palette.primary.light, 0.25) },
              "100%": { backgroundColor: alpha(theme.palette.primary.light, 0.15) },
            },
          }}
          onDoubleClick={handleEditDoubleClickOpenModal}
        >
          <Typography variant="body1" sx={{ whiteSpace: "pre-line" }}>
            {text}
          </Typography>
        </CardContent>
        {tag && (
          <CardMedia
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: alpha(tagColor[tag], 0.75),
              p: 0.5,
            }}
          >
            <Typography>{tag}</Typography>
          </CardMedia>
        )}
      </Card>

      {isEditable && (
        <Menu
          open={openMenu}
          onClose={handleCloseMenu}
          anchorReference="anchorPosition"
          anchorPosition={
            contextMenu !== null
              ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
              : undefined
          }
          MenuListProps={{
            "aria-labelledby": "context-menu",
          }}
        >
          <MenuItem onClick={handleEditOpenModal}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit note</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleSplitOpenModal}>
            <ListItemIcon>
              <CallSplitIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Split note</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleDeleteOpenModal}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText sx={{ color: theme.palette.error.main }}>Delete note</ListItemText>
          </MenuItem>
          <Divider />
          <ListSubheader>Modifier</ListSubheader>
          {tag !== null && (
            <MenuItem onClick={handleClearModifier}>
              <ListItemIcon>
                <AddLinkIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>None</ListItemText>
            </MenuItem>
          )}
          {allowedModifiers.map(
            (modifier) =>
              tag !== modifier && (
                <MenuItem key={modifier} onClick={() => handleSet(modifier)}>
                  <ListItemIcon>
                    <AddLinkIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>{modifier}</ListItemText>
                </MenuItem>
              ),
          )}
        </Menu>
      )}

      {isEditable && (
        <>
          <EditNoteModal
            isOpen={editModal.isOpen}
            noteId={id}
            noteState={state}
            noteText={text}
            onClose={handleEditCloseModal}
            hasTextFocus={textFocus}
            clearTextFocus={handleClearTextFocus}
          />

          <SplitNoteModal
            isOpen={splitModal.isOpen}
            originalNote={{ id, text, name, owner_id, color, state, predecessor_id, updated, created, tag }}
            users={users}
            onClose={splitModal.closeModal}
            selectedUserId={currentUser ? parseInt(currentUser) : undefined}
          />

          <DeleteNoteModal isOpen={deleteModal.isOpen} noteId={id} onClose={deleteModal.closeModal} />
        </>
      )}
    </>
  )
}
