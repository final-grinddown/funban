import { DragEvent, useRef, useState } from "react"
import AddIcon from "@mui/icons-material/Add"
import MoreVertIcon from "@mui/icons-material/MoreVert"
import { Box, IconButton, List, Typography, Menu, MenuItem, ListItemText, ListItemIcon } from "@mui/material"
import { useTheme } from "@mui/material/styles"
import { useHotkeys } from "react-hotkeys-hook"
import { useAppStore, selectUsers, selectIsFocus, selectCurrentUser } from "@/store"
import { Note } from "@/utils/interfaces"
import { AddNewNoteModal } from "./AddNewNoteModal"
import { BoardItemCard } from "./BoardItemCard"
import { DeleteNoteBulkModal } from "./DeleteNoteBulkModal"
import { DragAndDropPlaceholder } from "./DragAndDropPlaceholder"

interface Props {
  title: string
  items: Note[]
  state: Note["state"]
  isEditable: boolean
  onDragStart: (event: DragEvent<HTMLDivElement>, itemId: string) => void
  onDrop: (event: DragEvent<HTMLDivElement>, columnId: string, index: number | null) => void
  onDragEnd: () => void
  columnIndex: number
}

export function BoardColumn({
  title,
  items,
  state,
  isEditable,
  onDragStart,
  onDragEnd,
  onDrop,
  columnIndex,
}: Props) {
  const users = useAppStore(selectUsers)
  const isFocus = useAppStore(selectIsFocus)
  const currentUser = useAppStore(selectCurrentUser)
  const selectedUserId = useAppStore((state) => state.ui.selectedUserId)
  const hoveredColumn = useAppStore((state) => state.ui.hoveredColumn)
  const setHoveredColumn = useAppStore((state) => state.ui.setHoveredColumn)
  const openModal = useAppStore((state) => state.modals.openModal)
  const closeModal = useAppStore((state) => state.modals.closeModal)
  const isAnyModalOpen = useAppStore((state) => state.modals.isAnyModalOpen)
  const addNewNoteModalOpen = useAppStore((state) => state.modals.addNewNote.isOpen)
  const deleteNoteBulkModalOpen = useAppStore((state) => state.modals.deleteNoteBulk.isOpen)
  const theme = useTheme()
  const [draggedOverId, setDraggedOverId] = useState<number | "last" | null>(null)
  const lastHoveredRef = useRef<string | null>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const openMenu = Boolean(anchorEl)
  const [textFocus, setTextFocus] = useState(false)
  const [newNoteDefaultValues, setNewNoteDefaultValues] = useState({ state: "", ownerId: "" })

  const handleOpenMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleCloseMenu = () => {
    setAnchorEl(null)
  }

  useHotkeys(
    "shift+" + (columnIndex + 1),
    (event) => {
      if (isAnyModalOpen()) {
        // Prevent opening another modal if any modal is already open globally
        return
      }

      event.preventDefault()
      handleOpenAddNewNoteModal(true)
    },
    {},
    [columnIndex, selectedUserId, state, isAnyModalOpen],
  )

  const handleOpenAddNewNoteModal = (focusText: boolean = false) => {
    handleCloseMenu()
    setTextFocus(focusText)
    setNewNoteDefaultValues({ state: state, ownerId: String(selectedUserId) })
    openModal("addNewNote", { state, ownerId: String(selectedUserId), focusText })
  }
  const handleCloseAddNewNoteModal = () => {
    setNewNoteDefaultValues({ state: "", ownerId: "" })
    closeModal("addNewNote")
  }
  const handleDeleteAllNotes = () => {
    handleCloseMenu()
    openModal("deleteNoteBulk", { state, userId: selectedUserId, isFocus: false })
  }
  const handleDeleteAllUserNotes = () => {
    handleCloseMenu()
    openModal("deleteNoteBulk", { state, userId: selectedUserId, userName: currentUser, isFocus: true })
  }
  const handleCloseDeleteNoteBulkModal = () => {
    closeModal("deleteNoteBulk")
  }
  // Calculate the position based on Y-coordinate
  const handleDragOver = (event: DragEvent<HTMLDivElement>, index: number, element: HTMLElement) => {
    event.preventDefault()

    if (lastHoveredRef.current !== title) {
      lastHoveredRef.current = title
      setHoveredColumn(title)
    }

    const boundingRect = element.getBoundingClientRect()
    const midpoint = (boundingRect.top + boundingRect.bottom) / 2
    let curr_id = element.dataset.id
    if (event.clientY < midpoint) {
      // If mouse is above the midpoint of the card, show placeholder before the card
      if (draggedOverId !== curr_id) {
        //setDraggedOverIndex(index)
        setDraggedOverId(element.dataset.id === "last" ? "last" : Number(element.dataset.id))
      }
    } else {
      let curr_next = element.nextElementSibling as HTMLElement

      if (curr_next) {
        let curr_next_id = curr_next.dataset.id

        if (curr_next_id !== undefined && draggedOverId !== curr_next_id) {
          setDraggedOverId(curr_next_id === "last" ? "last" : Number(curr_next_id))
        }
      } else {
        setDraggedOverId("last")
      }

      // If mouse is below the midpoint, show placeholder after the card
      // if (draggedOverIndex !== index + 1) {
      //   //setDraggedOverIndex(index + 1)
      //   if (element.nextElementSibling) {
      //     setDraggedOverId())
      //   } else {
      //     setDraggedOverId("last")
      //   }
      // }
    }
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()

    if (draggedOverId === null) {
      setDraggedOverId("last") // If the column is empty, drop the item at index 0
    }

    onDrop(event, title, draggedOverId === "last" ? null : draggedOverId)

    setDraggedOverId(null)
    setIsDraggingOver(false)
    lastHoveredRef.current = null
    setHoveredColumn(null)
  }

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    const relatedTarget = event.relatedTarget as HTMLElement

    if (relatedTarget && event.currentTarget.contains(relatedTarget)) {
      return
    }

    setDraggedOverId(null)
    setIsDraggingOver(false)
    lastHoveredRef.current = null
    setHoveredColumn(null)
  }

  const handleDragEnter = () => {
    setIsDraggingOver(true)
  }

  return (
    <Box
      bgcolor="background.paper"
      width="100%"
      minWidth={300}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
      onDragEnter={handleDragEnter}
      onDragOver={(event) => event.preventDefault()} // Allow dragging over empty columns
      sx={{
        border: hoveredColumn === title ? "2px dashed #1976d2" : "2px solid transparent",
        transition: "border 0.3s ease",
        borderRadius: 2,
      }}
    >
      <Box
        p={2}
        bgcolor="primary.main"
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        sx={{ borderTopLeftRadius: 4, borderTopRightRadius: 4 }}
      >
        <Typography variant="h2">{title}</Typography>
        <IconButton
          onClick={handleOpenMenu}
          aria-controls={openMenu ? "basic-column-menu" : undefined}
          aria-haspopup="true"
          aria-expanded={openMenu ? "true" : undefined}
          sx={{ borderRadius: "50%", padding: 1, border: `2px solid ${theme.palette.text.primary}` }}
        >
          <MoreVertIcon />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={openMenu}
          onClose={handleCloseMenu}
          MenuListProps={{
            "aria-labelledby": "open edit note menu",
          }}
        >
          <MenuItem onClick={() => handleOpenAddNewNoteModal()}>
            <ListItemIcon>
              <AddIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Add new note</ListItemText>
          </MenuItem>

          {isFocus && selectedUserId && (
            <MenuItem onClick={handleDeleteAllUserNotes}>
              <ListItemIcon>
                <AddIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Delete all {title} for user</ListItemText>
            </MenuItem>
          )}

          {!isFocus && (
            <MenuItem onClick={handleDeleteAllNotes}>
              <ListItemIcon>
                <AddIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Delete all {title}</ListItemText>
            </MenuItem>
          )}
        </Menu>
      </Box>
      <List>
        {items.length === 0 && isDraggingOver && (
          <DragAndDropPlaceholder onDragOver={(event) => event.preventDefault()} />
        )}

        {items
          .filter((i) => !isFocus || i.name === currentUser)
          .map((item, index) => (
            <div
              key={item.id}
              data-id={item.id}
              onDragOver={(event) => handleDragOver(event, index, event.currentTarget)}
            >
              {draggedOverId === item.id && (
                <DragAndDropPlaceholder onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} />
              )}
              <BoardItemCard
                {...item}
                isEditable={isEditable}
                predecessor_id={item.predecessor_id}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            </div>
          ))}

        {draggedOverId === "last" && (
          <DragAndDropPlaceholder onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} />
        )}
      </List>

      <AddNewNoteModal
        isOpen={addNewNoteModalOpen}
        onClose={handleCloseAddNewNoteModal}
        users={users}
        defaultValues={newNoteDefaultValues}
        hasTextFocus={textFocus}
        clearTextFocus={() => setTextFocus(false)}
      />
      {selectedUserId && (
        <DeleteNoteBulkModal
          isOpen={deleteNoteBulkModalOpen}
          onClose={handleCloseDeleteNoteBulkModal}
          state={state}
          userId={selectedUserId}
          userName={currentUser}
          isFocus={isFocus}
        />
      )}
    </Box>
  )
}
