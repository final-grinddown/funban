import { useState } from "react"
import { SelectChangeEvent } from "@mui/material"
import { IUser } from "@/utils/interfaces"
import { useFocusStateStore } from "@/utils/store"

export function useUserSelection(users: IUser[]) {
  const [user, setUser] = useState(String(users[0].id))
  const { currentUser, setCurrentUser } = useFocusStateStore()

  const getCurrentUserIndex = () => users.findIndex((user) => user.name === currentUser)

  const handleChange = (event: SelectChangeEvent) => {
    const selectedUserId = event.target.value
    setUser(selectedUserId)
    const selectedUserObject = users.find((u) => u.id === parseInt(selectedUserId))

    if (selectedUserObject) setCurrentUser(selectedUserObject.name)
  }

  const handlePrevUser = () => {
    const currentIndex = getCurrentUserIndex()
    const prevIndex = (currentIndex - 1 + users.length) % users.length
    setUser(users[prevIndex].id.toString())
    setCurrentUser(users[prevIndex].name)
  }

  const handleNextUser = () => {
    const currentIndex = getCurrentUserIndex()
    const nextIndex = (currentIndex + 1) % users.length
    setUser(users[nextIndex].id.toString())
    setCurrentUser(users[nextIndex].name)
  }

  return {
    user,
    handleChange,
    handlePrevUser,
    handleNextUser,
  }
}
