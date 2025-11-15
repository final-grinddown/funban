/**
 * useModalSubmission Hook
 *
 * Encapsulates the common pattern of managing modal submission state and auto-closing
 * when a mutation completes. This pattern was duplicated 98+ times across modals.
 *
 * Usage:
 * ```tsx
 * const { isSubmitting, setIsSubmitting } = useModalSubmission(mutation.isPending, onClose)
 *
 * const handleSubmit = () => {
 *   setIsSubmitting(true)
 *   mutation.mutate(data)
 * }
 * ```
 */

import { useEffect, useState } from "react"

/**
 * Manages modal submission state and auto-closes modal when loading completes
 *
 * @param isLoading - Whether the mutation/operation is currently loading
 * @param onClose - Callback to close the modal
 * @param shouldClose - Optional condition to prevent auto-close (defaults to true)
 * @returns Object with isSubmitting state and setter
 */
export function useModalSubmission(
  isLoading: boolean,
  onClose: () => void,
  shouldClose: boolean = true
) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // When submission completes (isLoading becomes false), close the modal if condition is met
    if (isSubmitting && !isLoading && shouldClose) {
      onClose()
      setIsSubmitting(false)
    } else if (isSubmitting && !isLoading) {
      // Reset submitting flag even if not closing
      setIsSubmitting(false)
    }
  }, [isLoading, isSubmitting, onClose, shouldClose])

  return { isSubmitting, setIsSubmitting }
}
