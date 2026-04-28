import { useState } from "react"

/**
 * Custom hook for managing note card context menu and submission state.
 * Centralizes state management for note card interactions.
 *
 * @returns Modal state and handlers
 */
export function useNoteCardModals() {
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number
    mouseY: number
  } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    openContextMenu,
    closeContextMenu,
    setIsSubmitting,
  }
}
