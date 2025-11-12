import { SyntheticEvent, useState } from "react"
import { useAppStore } from "@/store"

export function useBoardModalManagement(isFocus: boolean, handleEndFocus: () => void) {
  const { openModal, closeModal, modals } = useAppStore((state) => state.modals)
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
    isEndStatusModalOpen: modals.endStatus.isOpen,
    isAddNewNoteModalOpen: modals.addNewNote.isOpen,
    isAddUserMarkModalOpen: modals.addUserMark.isOpen,
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
    isAnyModalOpen: modals.isAnyModalOpen(),
  }
}
