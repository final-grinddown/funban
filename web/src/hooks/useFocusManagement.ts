import { useState } from "react"
import { IUser } from "@/utils/interfaces"
import { useFocusStateStore } from "@/utils/store"

export function useFocusManagement(users: IUser[]) {
  const { isFocus, setIsFocus, currentUser, setCurrentUser } = useFocusStateStore()
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
