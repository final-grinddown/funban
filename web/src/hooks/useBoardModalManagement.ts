import { SyntheticEvent, useState } from "react"
import { useAppStore } from "@/store"

export function useBoardModalManagement(isFocus: boolean, handleEndFocus: () => void) {
  const openModal = useAppStore((state) => state.modals.openModal)
  const closeModal = useAppStore((state) => state.modals.closeModal)
  const endStatusIsOpen = useAppStore((state) => state.modals.endStatus.isOpen)
  const addNewNoteIsOpen = useAppStore((state) => state.modals.addNewNote.isOpen)
  const addUserMarkIsOpen = useAppStore((state) => state.modals.addUserMark.isOpen)
  const isAnyModalOpen = useAppStore((state) => state.modals.isAnyModalOpen)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const handleOpenAddNewNoteModal = () => {
    openModal("addNewNote")
  }

  const handleCloseAddNewNoteModal = () => {
    closeModal("addNewNote")
  }

  const handleOpenEndStatusModal = () => {
    openModal("endStatus")

    if (isFocus) {
      handleEndFocus()
    }
  }
  const handleCloseEndStatusModal = () => {
    closeModal("endStatus")
  }

  const handleOpenAddUserMarkModal = () => {
    openModal("addUserMark")
  }

  const handleCloseAddUserMarkModal = () => {
    closeModal("addUserMark")
  }

  const handleOpenMenu = (event: SyntheticEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)

    if (isFocus) {
      handleEndFocus()
    }
  }
  const handleCloseMenu = () => setAnchorEl(null)

  return {
    isEndStatusModalOpen: endStatusIsOpen,
    isAddNewNoteModalOpen: addNewNoteIsOpen,
    isAddUserMarkModalOpen: addUserMarkIsOpen,
    anchorEl,
    openMenu: Boolean(anchorEl),
    handleOpenAddNewNoteModal,
    handleCloseAddNewNoteModal,
    handleOpenEndStatusModal,
    handleCloseEndStatusModal,
    handleOpenAddUserMarkModal,
    handleCloseAddUserMarkModal,
    handleOpenMenu,
    handleCloseMenu,
    isAnyModalOpen: isAnyModalOpen(),
  }
}
