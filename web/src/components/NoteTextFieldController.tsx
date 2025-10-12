import { TextField } from "@mui/material"
import { Controller, Control, FieldErrors, FieldPath } from "react-hook-form"
import { textValidationRules } from "@/hooks/useFormValidation"
import { MaxTextLength } from "@/utils/constants"
import { TextLengthCounter } from "./TextLengthCounter"

interface Props<TFormData extends Record<string, any>> {
  name: FieldPath<TFormData>
  control: Control<TFormData>
  label?: string
  minRows?: number
  autoFocus?: boolean
  errors: FieldErrors<TFormData>
  currentText?: string
  showLengthCounter?: boolean
  onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void
  sx?: any
  inputRef?: React.RefObject<HTMLInputElement | null>
  required?: boolean
  maxLength?: number
}

export const NoteTextFieldController = <TFormData extends Record<string, any>>({
  name,
  control,
  label = "Note Text",
  minRows = 4,
  autoFocus = false,
  errors,
  currentText = "",
  showLengthCounter = true,
  onKeyDown,
  sx = { mb: 2 },
  inputRef,
  required = true,
  maxLength = MaxTextLength,
}: Props<TFormData>) => {
  const fieldError = errors[name]

  return (
    <>
      <Controller
        name={name}
        control={control}
        rules={{
          ...(required && { required: textValidationRules.required }),
          maxLength: { value: maxLength, message: `Text cannot exceed ${maxLength} characters` },
          minLength: required ? textValidationRules.minLength : undefined
        }}
        render={({ field }) => (
          <TextField
            {...field}
            inputRef={inputRef}
            autoFocus={autoFocus}
            label={label}
            multiline
            minRows={minRows}
            variant="outlined"
            fullWidth
            sx={sx}
            error={!!fieldError}
            helperText={fieldError ? (fieldError as any).message : ""}
            onKeyDown={onKeyDown}
          />
        )}
      />
      
      {showLengthCounter && currentText && currentText.length > 0 && (
        <TextLengthCounter currentLength={currentText.length} maxLength={maxLength} />
      )}
    </>
  )
}