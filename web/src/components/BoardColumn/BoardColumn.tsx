import { DragEvent, useCallback, useRef, useState } from "react"
import { Box } from "@mui/material"
import { useHotkeys } from "react-hotkeys-hook"
import { useBoardColumnModals } from "@/hooks/useBoardColumnModals"
import { useAppStore, selectUsers, selectIsFocus, selectCurrentUser } from "@/store"
import { Note } from "@/utils/interfaces"
import { AddNewNoteModal } from "../AddNewNoteModal"
import { DeleteNoteBulkModal } from "../DeleteNoteBulkModal"
import { BoardColumnHeader } from "./BoardColumnHeader"
import { BoardColumnList } from "./BoardColumnList"
import { BoardColumnMenu } from "./BoardColumnMenu"

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

  const [draggedOverId, setDraggedOverId] = useState<number | "last" | null>(null)
  const lastHoveredRef = useRef<string | null>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const openMenu = Boolean(anchorEl)

  const { textFocus, setTextFocus, newNoteDefaultValues, setNewNoteDefaultValues, clearTextFocus } =
    useBoardColumnModals()

  const handleOpenMenu = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }, [])

  const handleCloseMenu = useCallback(() => {
    setAnchorEl(null)
  }, [])

  useHotkeys(
    "shift+" + (columnIndex + 1),
    (event) => {
      if (isAnyModalOpen()) {
        return
      }
      event.preventDefault()
      handleOpenAddNewNoteModal(true)
    },
    {},
    [columnIndex, selectedUserId, state, isAnyModalOpen],
  )

  const handleOpenAddNewNoteModal = useCallback(
    (focusText: boolean = false) => {
      handleCloseMenu()
      setTextFocus(focusText)
      setNewNoteDefaultValues({ state: state, ownerId: String(selectedUserId) })
      openModal("addNewNote", { state, ownerId: String(selectedUserId), focusText })
    },
    [handleCloseMenu, setTextFocus, setNewNoteDefaultValues, state, selectedUserId, openModal],
  )

  const handleCloseAddNewNoteModal = useCallback(() => {
    setNewNoteDefaultValues({ state: "", ownerId: "" })
    closeModal("addNewNote")
  }, [setNewNoteDefaultValues, closeModal])

  const handleDeleteAllNotes = useCallback(() => {
    handleCloseMenu()
    openModal("deleteNoteBulk", { state, userId: selectedUserId, isFocus: false })
  }, [handleCloseMenu, openModal, state, selectedUserId])

  const handleDeleteAllUserNotes = useCallback(() => {
    handleCloseMenu()
    openModal("deleteNoteBulk", { state, userId: selectedUserId, userName: currentUser, isFocus: true })
  }, [handleCloseMenu, openModal, state, selectedUserId, currentUser])

  const handleCloseDeleteNoteBulkModal = useCallback(() => {
    closeModal("deleteNoteBulk")
  }, [closeModal])

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>, index: number, element: HTMLElement) => {
      event.preventDefault()

      if (lastHoveredRef.current !== title) {
        lastHoveredRef.current = title
        setHoveredColumn(title)
      }

      const boundingRect = element.getBoundingClientRect()
      const midpoint = (boundingRect.top + boundingRect.bottom) / 2
      let curr_id = element.dataset.id

      if (event.clientY < midpoint) {
        if (draggedOverId !== curr_id) {
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
      }
    },
    [title, setHoveredColumn, draggedOverId],
  )

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()

      if (draggedOverId === null) {
        setDraggedOverId("last")
      }

      onDrop(event, title, draggedOverId === "last" ? null : draggedOverId)

      setDraggedOverId(null)
      setIsDraggingOver(false)
      lastHoveredRef.current = null
      setHoveredColumn(null)
    },
    [draggedOverId, onDrop, title, setHoveredColumn],
  )

  const handleDragLeave = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      const relatedTarget = event.relatedTarget as HTMLElement

      if (relatedTarget && event.currentTarget.contains(relatedTarget)) {
        return
      }

      setDraggedOverId(null)
      setIsDraggingOver(false)
      lastHoveredRef.current = null
      setHoveredColumn(null)
    },
    [setHoveredColumn],
  )

  const handleDragEnter = useCallback(() => {
    setIsDraggingOver(true)
  }, [])

  return (
    <Box
      bgcolor="background.paper"
      width="100%"
      minWidth={300}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
      onDragEnter={handleDragEnter}
      onDragOver={(event) => event.preventDefault()}
      sx={{
        border: hoveredColumn === title ? "2px dashed #1976d2" : "2px solid transparent",
        transition: "border 0.3s ease",
        borderRadius: 2,
      }}
    >
      <BoardColumnHeader title={title} onMenuClick={handleOpenMenu} menuOpen={openMenu} />

      <BoardColumnMenu
        anchorEl={anchorEl}
        open={openMenu}
        title={title}
        isFocus={isFocus}
        selectedUserId={selectedUserId}
        onClose={handleCloseMenu}
        onAddNote={() => handleOpenAddNewNoteModal()}
        onDeleteAllNotes={handleDeleteAllNotes}
        onDeleteAllUserNotes={handleDeleteAllUserNotes}
      />

      <BoardColumnList
        items={items}
        isFocus={isFocus}
        currentUser={currentUser}
        isEditable={isEditable}
        draggedOverId={draggedOverId}
        isDraggingOver={isDraggingOver}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      />

      <AddNewNoteModal
        isOpen={addNewNoteModalOpen}
        onClose={handleCloseAddNewNoteModal}
        users={users}
        defaultValues={newNoteDefaultValues}
        hasTextFocus={textFocus}
        clearTextFocus={clearTextFocus}
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
