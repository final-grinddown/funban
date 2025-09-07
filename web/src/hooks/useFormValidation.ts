import { MaxTextLength } from "@/utils/constants"

export interface FormValidationResult {
  /** Whether the text field is valid */
  isTextValid: boolean
  /** Whether the text field has changed from original */
  isTextChanged: boolean
  /** Combined validation for form submission */
  isFormSubmittable: boolean
}

export interface UseFormValidationProps {
  /** Current text value (should not be undefined with proper form initialization) */
  text: string | undefined
  /** Original text value for comparison */
  originalText?: string
  /** Whether form has any changes */
  isDirty: boolean
  /** Whether all form fields are valid */
  isValid: boolean
  /** Additional custom validation */
  customValidation?: boolean
}

/**
 * Custom hook for standardizing form validation logic across modal components.
 * Handles common validation patterns for text length, dirty state, and custom rules.
 */
export function useFormValidation({
  text,
  originalText,
  isDirty,
  isValid,
  customValidation = true,
}: UseFormValidationProps): FormValidationResult {
  // Defensive handling for undefined text (should not happen with proper form initialization)
  const safeText = text ?? ""
  const isTextValid = safeText.length > 0 && safeText.length <= MaxTextLength
  const isTextChanged = originalText !== undefined ? safeText !== originalText : true
  
  const isFormSubmittable = 
    isValid && 
    isDirty && 
    isTextValid && 
    isTextChanged && 
    customValidation

  return {
    isTextValid,
    isTextChanged,
    isFormSubmittable,
  }
}

/**
 * Validation rules for text fields
 */
export const textValidationRules = {
  required: "Text is required",
  maxLength: {
    value: MaxTextLength,
    message: `Text must be ${MaxTextLength} characters or less`,
  },
  minLength: {
    value: 1,
    message: "Text cannot be empty",
  },
}

/**
 * Validation rules for required select fields
 */
export const requiredSelectRules = {
  required: "This field is required",
}