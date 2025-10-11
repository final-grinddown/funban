import { useEffect, useState } from "react"
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material"
import { Controller, useForm } from "react-hook-form"
import { UserMark } from "@/app/api/fetches"
import { BaseModal } from "@/components/BaseModal"
import { requiredSelectRules } from "@/hooks/useFormValidation"
import { User } from "@/utils/interfaces"

interface Props {
  isOpen: boolean
  onClose: () => void
  mark: UserMark
  users: User[]
  onSubmit: (data: { userId: number; markType: string; duration: number; customText?: string }) => void
}

interface FormInputs {
  userId: string
  markType: string
  duration: string
  customDuration: string
  customText: string
}

const markTypeOptions = [
  { value: "⚫", label: "⚫ Black Mark" },
  { value: "⭐", label: "⭐ Gold Star" },
  { value: "🕐", label: "🕐 Clock" },
  { value: "🩺", label: "🩺 Doctor" },
  { value: "🌴", label: "🌴 Vacation" },
  { value: "🦒", label: "🦒 Giraffe" },
  { value: "🔕", label: "🔕 Do Not Disturb" },
]

const durationOptions = [
  { value: "0", label: "Expired (0)" },
  { value: "1", label: "Current status (1)" },
  { value: "2", label: "Until next (2)" },
  { value: "5", label: "For a week (5)" },
  { value: "custom", label: "Custom" },
]

export function EditUserMarkModal({ isOpen, onClose, mark, users, onSubmit }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isValid },
  } = useForm<FormInputs>({
    defaultValues: {
      userId: mark.user_id.toString(),
      markType: mark.mark_type,
      duration: mark.expires_after_status_ends.toString(),
      customDuration: "",
      customText: mark.custom_text || "",
    },
    mode: "onChange",
  })

  const duration = watch("duration")
  const showCustomDuration = duration === "custom"

  const handleFormSubmit = (data: FormInputs) => {
    setIsSubmitting(true)

    const finalDuration = data.duration === "custom"
      ? parseInt(data.customDuration, 10)
      : parseInt(data.duration, 10)

    onSubmit({
      userId: parseInt(data.userId, 10),
      markType: data.markType,
      duration: finalDuration,
      customText: data.customText || undefined,
    })

    setIsSubmitting(false)
    onClose()
  }

  useEffect(() => {
    if (isOpen) {
      // Check if duration matches a preset
      const durationStr = mark.expires_after_status_ends.toString()
      const hasPreset = durationOptions.some(opt => opt.value === durationStr)

      reset({
        userId: mark.user_id.toString(),
        markType: mark.mark_type,
        duration: hasPreset ? durationStr : "custom",
        customDuration: hasPreset ? "" : durationStr,
        customText: mark.custom_text || "",
      })
    }
  }, [isOpen, mark, reset])

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit User Mark"
      primaryButtonText="Save Changes"
      primaryButtonAction={handleSubmit(handleFormSubmit)}
      primaryButtonDisabled={isSubmitting || !isValid}
      primaryButtonLoading={isSubmitting}
      primaryButtonWidth="140px"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <Controller
          name="userId"
          control={control}
          rules={requiredSelectRules}
          render={({ field }) => (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel id="user-label">User</InputLabel>
              <Select {...field} labelId="user-label" label="User" error={!!errors.userId}>
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id.toString()}>
                    {user.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        />

        <Controller
          name="markType"
          control={control}
          rules={requiredSelectRules}
          render={({ field }) => (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel id="mark-type-label">Mark Type</InputLabel>
              <Select {...field} labelId="mark-type-label" label="Mark Type" error={!!errors.markType}>
                {markTypeOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        />

        <Controller
          name="duration"
          control={control}
          rules={requiredSelectRules}
          render={({ field }) => (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel id="duration-label">Duration</InputLabel>
              <Select {...field} labelId="duration-label" label="Duration" error={!!errors.duration}>
                {durationOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        />

        {showCustomDuration && (
          <Controller
            name="customDuration"
            control={control}
            rules={{
              required: "Custom duration is required",
              min: { value: 0, message: "Duration must be at least 0" }
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                type="number"
                label="Custom Duration (status ends)"
                error={!!errors.customDuration}
                helperText={errors.customDuration?.message}
                sx={{ mt: 2 }}
              />
            )}
          />
        )}

        <Controller
          name="customText"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Custom Text (optional)"
              placeholder="e.g., Great work!"
              sx={{ mt: 2 }}
            />
          )}
        />
      </form>
    </BaseModal>
  )
}
