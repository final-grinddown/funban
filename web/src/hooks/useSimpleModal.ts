import { useCallback, useState } from "react"

interface UseSimpleModalReturn {
  /** Whether the modal is currently open */
  isOpen: boolean
  /** Open the modal */
  openModal: () => void
  /** Close the modal */
  closeModal: () => void
}

/**
 * Simple hook for managing basic modal open/close state.
 * Use this for modals that don't need submission tracking.
 */
export function useSimpleModal(): UseSimpleModalReturn {
  const [isOpen, setIsOpen] = useState(false)

  const openModal = useCallback(() => {
    setIsOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setIsOpen(false)
  }, [])

  return {
    isOpen,
    openModal,
    closeModal,
  }
}
