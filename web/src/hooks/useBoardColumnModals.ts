import { useState } from "react"

/**
 * Custom hook for managing board column modal states.
 * Centralizes modal state management for AddNote and DeleteBulk modals.
 *
 * @returns Modal state and handlers
 */
export function useBoardColumnModals() {
  const [textFocus, setTextFocus] = useState(false)
  const [newNoteDefaultValues, setNewNoteDefaultValues] = useState({ state: "", ownerId: "" })

  return {
    textFocus,
    setTextFocus,
    newNoteDefaultValues,
    setNewNoteDefaultValues,
    clearTextFocus: () => setTextFocus(false),
  }
}
