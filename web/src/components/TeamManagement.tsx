import { useEffect, useMemo, useState } from "react"
import AddIcon from "@mui/icons-material/Add"
import { Box, Button, Grid } from "@mui/material"
import { AddNewTeamMemberModal } from "./AddNewTeamMemberModal"
import { ColorEditModal } from "./ColorEditModal"
import { DeleteConfirmationModal } from "./DeleteConfirmationModal"
import { NameEditModal } from "./NameEditModal"
import { TeamMemberCard } from "./TeamMemberCard"
import {
  createAddUserMessage,
  createDeleteUser,
  createUpdateUserColorMessage,
  createUpdateUserNameMessage,
} from "@/app/api/websocket"
import { useWebSocketContext } from "@/context/WebSocketProvider"
import { availableColors } from "@/utils/constants"
import { IUser } from "@/utils/interfaces"

interface Props {
  users: IUser[]
}

export function TeamManagement({ users }: Props) {
  const { sendMessageAsync, isLoading } = useWebSocketContext()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingNameId, setEditingNameId] = useState<number | null>(null)
  const [editingColorId, setEditingColorId] = useState<number | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null)
  const [deletingUserName, setDeletingUserName] = useState<string | null>(null)
  const [currentName, setCurrentName] = useState<string>("")
  const [currentColor, setCurrentColor] = useState<string>("")
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // Create an array of existing names from users prop
  const existingNames = useMemo(() => users.map((user) => user.name), [users])

  const handleAddNewUser = (name: string, color: string) => {
    const addUserMessage = createAddUserMessage(name, color)
    sendMessageAsync(addUserMessage, "User " + name + " added successfully!")
    setIsSubmitting(true)
  }

  const handleOpenAddNewUserModal = () => {
    setIsAddModalOpen(true)

    if (isSubmitting) {
      setIsSubmitting(false)
    }
  }

  const handleEditNameClick = (id: number, name: string) => {
    setEditingNameId(id)
    setCurrentName(name)

    if (isSubmitting) {
      setIsSubmitting(false)
    }
  }

  const handleEditColorClick = (id: number, color: string) => {
    const matchedColor = availableColors.find((c) => c.name.toLowerCase() === color.toLowerCase())?.name || color
    setEditingColorId(id)
    setCurrentColor(matchedColor)

    if (isSubmitting) {
      setIsSubmitting(false)
    }
  }

  const handleDeleteClick = (id: number, name: string) => {
    setDeletingUserId(id)
    setDeletingUserName(name)
    setIsDeleteModalOpen(true)

    if (isSubmitting) {
      setIsSubmitting(false)
    }
  }

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false)
    setDeletingUserId(null)
  }

  const handleSaveName = (newName: string) => {
    if (editingNameId !== null) {
      const message = createUpdateUserNameMessage(editingNameId, newName)
      sendMessageAsync(message, "User name updated successfully!")
      setIsSubmitting(true)
    }
  }

  const handleSaveColor = (newColor: string) => {
    if (editingColorId !== null) {
      const updateColorMessage = createUpdateUserColorMessage(editingColorId, newColor)
      sendMessageAsync(updateColorMessage, "User color updated successfully!")
      setIsSubmitting(true)
    }
  }

  const confirmDelete = () => {
    if (deletingUserId !== null) {
      const deleteMessage = createDeleteUser(deletingUserId)
      sendMessageAsync(deleteMessage, "User " + deletingUserName + " deleted successfully!")
      setIsSubmitting(true)
    }
  }

  useEffect(() => {
    if (isSubmitting && !isLoading) {
      if (editingColorId) {
        setEditingColorId(null)
      }

      if (editingNameId) {
        setEditingNameId(null)
      }

      if (isAddModalOpen) {
        setIsAddModalOpen(false)
      }

      if (deletingUserId) {
        handleCloseDeleteModal()
      }
    }
  }, [deletingUserId, editingColorId, editingNameId, isAddModalOpen, isLoading, isSubmitting])

  return (
    <Box display="flex" flexDirection="column" alignItems="flex-end">
      <Button variant="contained" sx={{ mb: 2 }} startIcon={<AddIcon />} onClick={handleOpenAddNewUserModal}>
        Add new team member
      </Button>
      <Grid container spacing={2}>
        {users.map(({ id, name, color }) => (
          <TeamMemberCard
            key={id}
            id={id}
            name={name}
            color={color}
            availableColors={availableColors}
            onEditName={() => handleEditNameClick(id, name)}
            onEditColor={() => handleEditColorClick(id, color)}
            onDelete={() => handleDeleteClick(id, name)}
          />
        ))}

        <AddNewTeamMemberModal
          isOpen={isAddModalOpen}
          existingNames={existingNames}
          onClose={() => setIsAddModalOpen(false)}
          onSave={handleAddNewUser}
          isSubmitting={isSubmitting}
        />

        <NameEditModal
          isOpen={editingNameId !== null}
          initialName={currentName}
          onClose={() => setEditingNameId(null)}
          onSave={handleSaveName}
          existingNames={existingNames}
          isSubmitting={isSubmitting}
        />

        <ColorEditModal
          isOpen={editingColorId !== null}
          currentColor={currentColor}
          availableColors={availableColors}
          onClose={() => setEditingColorId(null)}
          onSave={handleSaveColor}
          isSubmitting={isSubmitting}
        />

        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          userName={deletingUserName || ""}
          onClose={handleCloseDeleteModal}
          onConfirm={confirmDelete}
          isSubmitting={isSubmitting}
        />
      </Grid>
    </Box>
  )
}
