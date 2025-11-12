import { useState } from "react"

/**
 * Custom hook for managing note card modal states.
 * Centralizes modal state management for Edit, Delete, Split modals.
 *
 * @returns Modal state and handlers
 */
export function useNoteCardModals() {
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number
    mouseY: number
  } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [textFocus, setTextFocus] = useState(false)

  const openContextMenu = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setContextMenu({
      mouseX: event.clientX + 2,
      mouseY: event.clientY - 6,
    })

    if (isSubmitting) setIsSubmitting(false)
  }

  const closeContextMenu = () => {
    setContextMenu(null)
  }

  return {
    contextMenu,
    isSubmitting,
    textFocus,
    openContextMenu,
    closeContextMenu,
    setIsSubmitting,
    setTextFocus,
    clearTextFocus: () => setTextFocus(false),
  }
}
