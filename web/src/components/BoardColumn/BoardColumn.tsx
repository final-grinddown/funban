import { forwardRef, useCallback, useState } from "react"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Box } from "@mui/material"
import { useHotkeys } from "react-hotkeys-hook"
import { useAppStore, selectUsers, selectIsFocus, selectCurrentUser } from "@/store"
import { Note } from "@/utils/interfaces"
import { DeleteNoteBulkModal } from "../DeleteNoteBulkModal"
import { BoardColumnHeader } from "./BoardColumnHeader"
import { BoardColumnList } from "./BoardColumnList"
import { BoardColumnMenu } from "./BoardColumnMenu"

interface Props {
  title: string
  items: Note[]
  state: Note["state"]
  isEditable: boolean
  columnIndex: number
}

export const BoardColumn = forwardRef<HTMLDivElement, Props>(function BoardColumn({ title, items, state, isEditable, columnIndex }, ref) {
  const users = useAppStore(selectUsers)
  const isFocus = useAppStore(selectIsFocus)
  const currentUser = useAppStore(selectCurrentUser)
  const selectedUserId = useAppStore((state) => state.ui.selectedUserId)
  const openModal = useAppStore((state) => state.modals.openModal)
  const closeModal = useAppStore((state) => state.modals.closeModal)
  const isAnyModalOpen = useAppStore((state) => state.modals.isAnyModalOpen)
  const deleteNoteBulkModalOpen = useAppStore((state) => state.modals.deleteNoteBulk.isOpen)

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const openMenu = Boolean(anchorEl)

  // @dnd-kit droppable hook for the column
  const { setNodeRef, isOver } = useDroppable({
    id: title, // Use column title as droppable ID
  })

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
      openModal("addNewNote", { state, ownerId: String(selectedUserId), focusText })
    },
    [handleCloseMenu, state, selectedUserId, openModal],
  )

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

  // Merge droppable ref with forwarded ref
  const mergedRef = useCallback((node: HTMLDivElement | null) => {
    setNodeRef(node)
    if (typeof ref === 'function') {
      ref(node)
    } else if (ref) {
      ref.current = node
    }
  }, [setNodeRef, ref])

  return (
    <Box
      ref={mergedRef}
      bgcolor="background.paper"
      width="100%"
      minWidth={300}
      sx={{
        border: isOver ? "2px dashed #1976d2" : "2px solid transparent",
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

      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <BoardColumnList items={items} isFocus={isFocus} currentUser={currentUser} isEditable={isEditable} />
      </SortableContext>

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
})
