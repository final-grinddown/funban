import { DragEvent, SyntheticEvent, useCallback, useEffect, useState } from "react"
import AddLinkIcon from "@mui/icons-material/AddLink"
import DeleteIcon from "@mui/icons-material/Delete"
import EditIcon from "@mui/icons-material/Edit"
import EditNoteIcon from "@mui/icons-material/EditNote"
import FileCopyIcon from "@mui/icons-material/FileCopy"
import {
  Card,
  CardContent,
  CardHeader,
  CardMedia,
  CircularProgress,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material"
import { alpha, useTheme } from "@mui/material/styles"
import { createCloneNote, createUpdateNoteTag } from "@/app/api/websocket"
import { useWebSocketContext } from "@/context/WebSocketProvider"
import { availableColors } from "@/utils/constants"
import { formatDateToShow, matchColorName } from "@/utils/helpers"
import { DevSettings, INote } from "@/utils/interfaces"
import { getStoredDevIdsValue, getStoredDevPredecessorsValue } from "@/utils/storage"
import { useFocusStateStore } from "@/utils/store"
import { DeleteNoteModal } from "./DeleteNoteModal"
import { EditNoteModal } from "./EditNoteModal"

const HEADER_CONFIG_KEY = "funban-header-config"

interface Props extends INote {
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
  isEditable,
  predecessor_id,
  tag,
  onDragStart,
  onDragEnd,
}: Props) {
  const { sendMessage, sendMessageAsync, isLoading } = useWebSocketContext()
  const { isFocus, currentUser } = useFocusStateStore()
  const theme = useTheme()
  const matchedColor = matchColorName(color, availableColors) || "#000000"
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [textFocus, setTextFocus] = useState(false)
  const openMenu = Boolean(anchorEl)
  const contrastColor = theme.palette.getContrastText(matchedColor)
  const { updatedDate, createdDate, updatedRelative, createdRelative } = formatDateToShow(created, updated)
  const dateToShow =
    updated && updated !== created
      ? `Updated at ${isEditable ? updatedRelative : updatedDate}`
      : `Created at ${isEditable ? createdRelative : createdDate}`
  const headerConfig = localStorage.getItem(HEADER_CONFIG_KEY) || "updated_only"
  const devSettings: DevSettings = { ids: getStoredDevIdsValue(), predecessors: getStoredDevPredecessorsValue() }
  const handleMenu = useCallback(
    (event: SyntheticEvent<HTMLButtonElement> | null) => {
      setAnchorEl(event ? event.currentTarget : null)

      if (isSubmitting) setIsSubmitting(false)
    },
    [isSubmitting],
  )

  const handleOpenMenu = (event: SyntheticEvent<HTMLButtonElement>) => handleMenu(event)

  const handleCloseMenu = useCallback(() => handleMenu(null), [handleMenu])

  const handleEditModal = (focusText: boolean = false) => {
    setTextFocus(focusText)
    setIsEditModalOpen(true)
    handleCloseMenu()
  }

  const handleEditOpenModal = () => handleEditModal()

  const handleEditDoubleClickOpenModal = () => handleEditModal(true)

  const handleClearTextFocus = () => {
    setTextFocus(false)
  }

  const handleEditCloseModal = () => {
    setIsEditModalOpen(false)
  }

  const handleClearModifier = () => {
    const message = createUpdateNoteTag(id.toString(), null)
    sendMessageAsync(message, "Modifier reset")
    setIsSubmitting(true)
    handleCloseMenu()
  }

  const handleSet = (modifier: string) => {
    const message = createUpdateNoteTag(id.toString(), modifier)
    sendMessageAsync(message, "Modifier set to " + modifier)
    setIsSubmitting(true)
    handleCloseMenu()
  }

  const handleDeleteOpenModal = () => {
    setIsDeleteModalOpen(true)
    handleCloseMenu()
  }

  const handleDeleteCloseModal = () => {
    setIsDeleteModalOpen(false)
  }

  const handleCloneNote = () => {
    const message = createCloneNote(id.toString())
    sendMessage(message)
    setIsSubmitting(true)
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

  return (
    <>
      <Card
        draggable={isEditable}
        onDragStart={(event) => handleDrag(event, true)}
        onDragEnd={(event) => handleDrag(event, false)}
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
          action={
            isEditable &&
            (!isFocus || (isFocus && name === currentUser)) && (
              <>
                <IconButton
                  sx={{ color: contrastColor, border: `2px solid ${alpha(contrastColor, 0.75)}` }}
                  onClick={handleOpenMenu}
                  aria-controls={openMenu ? "basic-menu" : undefined}
                  aria-haspopup="true"
                  aria-expanded={openMenu ? "true" : undefined}
                  size="small"
                >
                  <EditNoteIcon />
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={openMenu}
                  onClose={handleCloseMenu}
                  MenuListProps={{
                    "aria-labelledby": "open edit note menu",
                  }}
                >
                  <MenuItem onClick={handleEditOpenModal}>
                    <ListItemIcon>
                      <EditIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Edit note</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={handleCloneNote}>
                    {isSubmitting ? (
                      <CircularProgress size={24} sx={{ mx: "auto" }} />
                    ) : (
                      <>
                        <ListItemIcon>
                          <FileCopyIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Clone note</ListItemText>
                      </>
                    )}
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
              </>
            )
          }
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
        <>
          <EditNoteModal
            isOpen={isEditModalOpen}
            noteId={id}
            noteState={state}
            noteText={text}
            onClose={handleEditCloseModal}
            hasTextFocus={textFocus}
            clearTextFocus={handleClearTextFocus}
          />

          <DeleteNoteModal isOpen={isDeleteModalOpen} noteId={id} onClose={handleDeleteCloseModal} />
        </>
      )}
    </>
  )
}
