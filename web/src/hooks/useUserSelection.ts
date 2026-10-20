import { useEffect } from "react"
import { SelectChangeEvent } from "@mui/material"
import { useAppStore } from "@/store"
import { User } from "@/utils/interfaces"

export function useUserSelection(users: User[]) {
  const selectedUserId = useAppStore((state) => state.ui.selectedUserId)
  const setSelectedUserId = useAppStore((state) => state.ui.setSelectedUserId)
  const { currentUser, setCurrentUser } = useAppStore((state) => state.focus)

  // Initialize selected user if not set
  useEffect(() => {
    if (selectedUserId === null && users.length > 0) {
      setSelectedUserId(users[0].id)
      setCurrentUser(users[0].name)
    }
  }, [users, selectedUserId, setSelectedUserId, setCurrentUser])

  const getCurrentUserIndex = () => users.findIndex((user) => user.name === currentUser)

  const handleChange = (event: SelectChangeEvent) => {
    const userId = parseInt(event.target.value)
    setSelectedUserId(userId)
    const selectedUserObject = users.find((u) => u.id === userId)

    if (selectedUserObject) setCurrentUser(selectedUserObject.name)
  }

  const handlePrevUser = () => {
    const currentIndex = getCurrentUserIndex()
    const prevIndex = (currentIndex - 1 + users.length) % users.length
    setSelectedUserId(users[prevIndex].id)
    setCurrentUser(users[prevIndex].name)
  }

  const handleNextUser = () => {
    const currentIndex = getCurrentUserIndex()
    const nextIndex = (currentIndex + 1) % users.length
    setSelectedUserId(users[nextIndex].id)
    setCurrentUser(users[nextIndex].name)
  }

  return {
    user: selectedUserId ? String(selectedUserId) : "",
    handleChange,
    handlePrevUser,
    handleNextUser,
  }
}
