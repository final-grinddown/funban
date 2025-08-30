import { useEffect, useMemo, useState } from "react"
import SettingsIcon from "@mui/icons-material/Settings"
import { Box, Button, ButtonGroup, Typography } from "@mui/material"
import { useHotkeys } from "react-hotkeys-hook"
import { AddNewNoteModal } from "@/components/AddNewNoteModal"
import { Board } from "@/components/Board"
import { BoardActionsMenu } from "@/components/BoardActionMenu"
import { EndStatusModal } from "@/components/EndStatusModal"
import { FocusControls } from "@/components/FocusControls"
import { UserSelector } from "@/components/UserSelector"
import { useBoardModalManagement } from "@/hooks/useBoardModalManagement"
import { useFocusManagement } from "@/hooks/useFocusManagement"
import { useUserSelection } from "@/hooks/useUserSelection"
import { INote, IUser } from "@/utils/interfaces"
import { useFocusStateStore } from "@/utils/store"

interface Props {
  users: IUser[]
  notes: INote[]
  accessToken?: string
}

export function BoardScreen({ users, notes, accessToken }: Props) {
  const { user, handleChange, handlePrevUser, handleNextUser } = useUserSelection(users)
  const { currentUser, setCurrentUser } = useFocusStateStore()
  const { isFocus, shouldRenderFocus, handleStartFocus, handleEndFocus } = useFocusManagement(users)
  const {
    isEndStatusModalOpen,
    isAddNewNoteModalOpen,
    anchorEl,
    openMenu,
    handleCloseEndStatusModal,
    handleOpenAddNewNoteModal,
    handleOpenEndStatusModal,
    handleCloseAddNewNoteModal,
    handleOpenMenu,
    handleCloseMenu,
    isAnyModalOpen,
    setIsAnyModalOpen,
  } = useBoardModalManagement(isFocus, handleEndFocus)

  const snapshot = useMemo(
    () =>
      notes.map((note) => ({
        id: note.id.toString(),
        text: note.text,
        state: note.state,
        predecessor_id: note.predecessor_id?.toString() ?? null,
        owner: { id: note.owner_id.toString(), name: note.name, color: note.color },
        updated: note.updated,
        created: note.created,
        tag: note.tag || null,
      })),
    [notes],
  )

  useEffect(() => {
    if (users.length > 0) {
      const selectedUser = users.find((u) => u.id === parseInt(user))
      if (selectedUser) {
        setCurrentUser(selectedUser.name)
      }
    }
  }, [user, users, setCurrentUser])

  useHotkeys("f", () => (isFocus ? handleEndFocus() : handleStartFocus()), [isFocus, handleStartFocus, handleEndFocus])

  useHotkeys("a", () => handlePrevUser(), [handlePrevUser])

  useHotkeys("d", () => handleNextUser(), [handleNextUser])

  return (
    <>
      <Typography variant="h1">Board</Typography>
      <Box
        mt={2}
        display="flex"
        flexDirection={{ xs: "column", sm: "row" }}
        flexWrap="wrap"
        gap={2}
        justifyContent="space-between"
      >
        <UserSelector users={users} selectedUser={user} onChange={handleChange} />
        <Button
          variant="contained"
          sx={{ display: { md: "none" } }}
          onClick={handleOpenMenu}
          startIcon={<SettingsIcon />}
        >
          Board actions
        </Button>
        <BoardActionsMenu
          anchorEl={anchorEl}
          openMenu={openMenu}
          onClose={handleCloseMenu}
          onStartFocus={handleStartFocus}
          onOpenEndStatusModal={handleOpenEndStatusModal}
          onOpenAddNewNoteModal={handleOpenAddNewNoteModal}
        />
        <ButtonGroup
          variant="contained"
          aria-label="Board button group"
          sx={{ maxWidth: { md: 600 }, display: { xs: "none", md: "flex" } }}
          fullWidth
        >
          <Button onClick={handleOpenAddNewNoteModal}>Create a new note</Button>
          <Button color="success" onClick={handleStartFocus} disabled={isFocus}>
            Start focus
          </Button>
          <Button color="error" onClick={handleOpenEndStatusModal}>
            End status
          </Button>
        </ButtonGroup>
      </Box>

      <Board
        notes={notes}
        isEditable={true}
        selectedUserId={parseInt(user)}
        isAnyModalOpen={isAnyModalOpen}
        setIsAnyModalOpen={setIsAnyModalOpen}
        isFocus={isFocus}
        currentUser={currentUser}
      />

      <AddNewNoteModal isOpen={isAddNewNoteModalOpen} onClose={handleCloseAddNewNoteModal} users={users} />

      <EndStatusModal
        isOpen={isEndStatusModalOpen}
        notes={snapshot}
        onClose={handleCloseEndStatusModal}
        accessToken={accessToken}
      />

      {shouldRenderFocus && (
        <FocusControls
          onPrevUser={handlePrevUser}
          onNextUser={handleNextUser}
          onEndFocus={handleEndFocus}
          isFocus={isFocus}
        />
      )}
    </>
  )
}
