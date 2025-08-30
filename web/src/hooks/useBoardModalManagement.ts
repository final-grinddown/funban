import { SyntheticEvent, useState } from "react"

export function useBoardModalManagement(isFocus: boolean, handleEndFocus: () => void) {
  const [isAddNewNoteModalOpen, setIsAddNewNoteModalOpen] = useState(false)
  const [isEndStatusModalOpen, setIsEndStatusModalOpen] = useState(false)
  const [isAnyModalOpen, setIsAnyModalOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const handleOpenAddNewNoteModal = () => {
    setIsAddNewNoteModalOpen(true)
    setIsAnyModalOpen(true)
  }

  const handleCloseAddNewNoteModal = () => {
    setIsAddNewNoteModalOpen(false)
    setIsAnyModalOpen(false)
  }

  const handleOpenEndStatusModal = () => {
    setIsEndStatusModalOpen(true)
    setIsAnyModalOpen(true)

    if (isFocus) {
      handleEndFocus()
    }
  }
  const handleCloseEndStatusModal = () => {
    setIsEndStatusModalOpen(false)
    setIsAnyModalOpen(false)
  }

  const handleOpenMenu = (event: SyntheticEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)

    if (isFocus) {
      handleEndFocus()
    }
  }
  const handleCloseMenu = () => setAnchorEl(null)

  return {
    isEndStatusModalOpen,
    isAddNewNoteModalOpen,
    anchorEl,
    openMenu: Boolean(anchorEl),
    handleOpenAddNewNoteModal,
    handleCloseAddNewNoteModal,
    handleOpenEndStatusModal,
    handleCloseEndStatusModal,
    handleOpenMenu,
    handleCloseMenu,
    isAnyModalOpen,
    setIsAnyModalOpen,
  }
}
