import { useCallback, useEffect, useState } from "react"

interface UseModalStateProps {
  /** Whether the modal should close automatically after successful submission */
  autoCloseOnSubmit?: boolean
  /** External loading state (e.g., from WebSocket context) */
  isExternalLoading?: boolean
}

interface UseModalStateReturn {
  /** Whether the modal is currently open */
  isOpen: boolean
  /** Whether a submission is in progress */
  isSubmitting: boolean
  /** Open the modal */
  openModal: () => void
  /** Close the modal */
  closeModal: () => void
  /** Mark that a submission has started */
  startSubmission: () => void
  /** Mark that a submission has finished */
  finishSubmission: () => void
}

/**
 * Custom hook for managing modal state including open/close and submission tracking.
 * Automatically closes modal after successful submission if autoCloseOnSubmit is enabled.
 */
export function useModalState({
  autoCloseOnSubmit = true,
  isExternalLoading = false,
}: UseModalStateProps = {}): UseModalStateReturn {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [wasSubmitting, setWasSubmitting] = useState(false)

  const openModal = useCallback(() => {
    setIsOpen(true)
    // Reset submission states when opening
    setIsSubmitting(false)
    setWasSubmitting(false)
  }, [])

  const closeModal = useCallback(() => {
    setIsOpen(false)
    setIsSubmitting(false)
    setWasSubmitting(false)
  }, [])

  const startSubmission = useCallback(() => {
    setIsSubmitting(true)
    setWasSubmitting(true)
  }, [])

  const finishSubmission = useCallback(() => {
    setIsSubmitting(false)
  }, [])

  // Auto-close modal after successful submission
  useEffect(() => {
    if (autoCloseOnSubmit && wasSubmitting && !isSubmitting && !isExternalLoading && isOpen) {
      closeModal()
    }
  }, [autoCloseOnSubmit, wasSubmitting, isSubmitting, isExternalLoading, isOpen, closeModal])

  return {
    isOpen,
    isSubmitting,
    openModal,
    closeModal,
    startSubmission,
    finishSubmission,
  }
}
