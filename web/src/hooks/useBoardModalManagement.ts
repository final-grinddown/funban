import { SyntheticEvent, useState } from "react"

export function useBoardModalManagement(isFocus: boolean, handleEndFocus: () => void) {
  const [isAddNewNoteModalOpen, setIsAddNewNoteModalOpen] = useState(false)
  const [isEndStatusModalOpen, setIsEndStatusModalOpen] = useState(false)
  const [isAddUserMarkModalOpen, setIsAddUserMarkModalOpen] = useState(false)
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

  const handleOpenAddUserMarkModal = () => {
    setIsAddUserMarkModalOpen(true)
    setIsAnyModalOpen(true)
  }

  const handleCloseAddUserMarkModal = () => {
    setIsAddUserMarkModalOpen(false)
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
    isAddUserMarkModalOpen,
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
    isAnyModalOpen,
    setIsAnyModalOpen,
  }
}
