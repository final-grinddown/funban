import { useState } from "react"
import { useAppStore } from "@/store"
import { User } from "@/utils/interfaces"

export function useFocusManagement(users: User[]) {
  const { isFocus, setIsFocus, currentUser, setCurrentUser } = useAppStore((state) => state.focus)
  const [shouldRenderFocus, setShouldRenderFocus] = useState(false)

  const getCurrentUserIndex = () => users.findIndex((user) => user.name === currentUser)

  const handleStartFocus = () => {
    const currentUserObject = users[getCurrentUserIndex()] || users[0]
    setIsFocus(true)
    setShouldRenderFocus(true)

    if (currentUserObject) setCurrentUser(currentUserObject.name)
  }

  const handleEndFocus = () => {
    setIsFocus(false)
    setTimeout(() => setShouldRenderFocus(false), 500)
  }

  return {
    isFocus,
    shouldRenderFocus,
    handleStartFocus,
    handleEndFocus,
  }
}
