import { useEffect, useMemo } from "react"
import SettingsIcon from "@mui/icons-material/Settings"
import { Box, Button, ButtonGroup, Typography } from "@mui/material"
import { useHotkeys } from "react-hotkeys-hook"
import { createAddUserMark } from "@/app/api/websocket"
import { AddNewNoteModal } from "@/components/AddNewNoteModal"
import { AddUserMarkModal } from "@/components/AddUserMarkModal"
import { Board } from "@/components/Board"
import { BoardActionsMenu } from "@/components/BoardActionMenu"
import { EndStatusModal } from "@/components/EndStatusModal"
import { FocusControls } from "@/components/FocusControls"
import { UserSelector } from "@/components/UserSelector"
import { useWebSocketContext } from "@/context/WebSocketProvider"
import { useBoardModalManagement } from "@/hooks/useBoardModalManagement"
import { useFocusManagement } from "@/hooks/useFocusManagement"
import { useUserSelection } from "@/hooks/useUserSelection"
import { useAppStore, selectUsers, selectNotes } from "@/store"

interface Props {
  accessToken?: string
}

export function BoardScreen({ accessToken }: Props) {
  // Read users and notes from Zustand store
  const users = useAppStore(selectUsers)
  const notes = useAppStore(selectNotes)

  const { user, handleChange, handlePrevUser, handleNextUser } = useUserSelection(users)
  const { currentUser, setCurrentUser } = useAppStore((state) => state.focus)
  const { isFocus, shouldRenderFocus, handleStartFocus, handleEndFocus } = useFocusManagement(users)
  const { sendMessageAsync } = useWebSocketContext()
  const {
    isEndStatusModalOpen,
    isAddNewNoteModalOpen,
    isAddUserMarkModalOpen,
    anchorEl,
    openMenu,
    handleCloseEndStatusModal,
    handleOpenAddNewNoteModal,
    handleOpenEndStatusModal,
    handleCloseAddNewNoteModal,
    handleOpenAddUserMarkModal,
    handleCloseAddUserMarkModal,
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

  const handleAddUserMark = (data: { userId: number; markType: string; duration?: number; customText?: string; expiresAt?: string }) => {
    const message = createAddUserMark(data.userId, data.markType, data.duration, data.customText, data.expiresAt)
    sendMessageAsync(message, "Mark added!")
  }

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
          sx={{ maxWidth: { md: 800 }, display: { xs: "none", md: "flex" } }}
          fullWidth
        >
          <Button onClick={handleOpenAddNewNoteModal}>Create a new note</Button>
          <Button color="success" onClick={handleStartFocus} disabled={isFocus}>
            Start focus
          </Button>
          <Button color="error" onClick={handleOpenEndStatusModal}>
            End status
          </Button>
          <Button color="warning" onClick={handleOpenAddUserMarkModal} disabled={!user}>
            Add mark
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

      <AddUserMarkModal
        isOpen={isAddUserMarkModalOpen}
        onClose={handleCloseAddUserMarkModal}
        users={users}
        selectedUserId={user ? parseInt(user) : undefined}
        onSubmit={handleAddUserMark}
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
