"use client"
import { useEffect, useState } from "react"
import { Checkbox, FormControl, FormControlLabel, InputLabel, MenuItem, Select, TextField } from "@mui/material"
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
  onSubmit: (data: {
    userId: number
    markType: string
    duration?: number
    customText?: string
    expiresAt?: string
  }) => void
}

interface FormInputs {
  userId: string
  markType: string
  useStandupExpiration: boolean
  duration: string
  customDuration: string
  useDateExpiration: boolean
  expirationDate: string
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
  { value: "custom", label: "Custom count" },
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
      useStandupExpiration: mark.expires_after_status_ends != null,
      duration: "",
      customDuration: "",
      useDateExpiration: mark.expires_at != null,
      expirationDate: "",
      customText: mark.custom_text || "",
    },
    mode: "onChange",
  })

  const useStandupExpiration = watch("useStandupExpiration")
  const useDateExpiration = watch("useDateExpiration")
  const duration = watch("duration")
  const showCustomDuration = useStandupExpiration && duration === "custom"

  const handleFormSubmit = (data: FormInputs) => {
    setIsSubmitting(true)

    let finalDuration: number | undefined
    let expiresAt: string | undefined

    if (data.useStandupExpiration) {
      finalDuration = data.duration === "custom" ? parseInt(data.customDuration, 10) : parseInt(data.duration, 10)
    }

    if (data.useDateExpiration && data.expirationDate) {
      expiresAt = new Date(data.expirationDate).toISOString()
    }

    onSubmit({
      userId: parseInt(data.userId, 10),
      markType: data.markType,
      duration: finalDuration,
      customText: data.customText || undefined,
      expiresAt,
    })

    setIsSubmitting(false)
    onClose()
  }

  useEffect(() => {
    if (isOpen) {
      const hasStandupExpiration = mark.expires_after_status_ends != null
      const hasDateExpiration = mark.expires_at != null

      // Check if duration matches a preset
      const durationStr = mark.expires_after_status_ends?.toString() || ""
      const hasPreset = durationOptions.some((opt) => opt.value === durationStr)

      // Format the date for datetime-local input
      let dateStr = ""
      if (mark.expires_at) {
        const date = new Date(mark.expires_at)
        // Format: YYYY-MM-DDTHH:mm
        dateStr = date.toISOString().slice(0, 16)
      }

      reset({
        userId: mark.user_id.toString(),
        markType: mark.mark_type,
        useStandupExpiration: hasStandupExpiration,
        duration: hasStandupExpiration ? (hasPreset ? durationStr : "custom") : "",
        customDuration: hasStandupExpiration && !hasPreset ? durationStr : "",
        useDateExpiration: hasDateExpiration,
        expirationDate: dateStr,
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
          name="useStandupExpiration"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={<Checkbox {...field} checked={field.value} />}
              label="Expires after standups"
              sx={{ mt: 2 }}
            />
          )}
        />

        {useStandupExpiration && (
          <Controller
            name="duration"
            control={control}
            rules={{ required: "Duration is required when expiration by standups is enabled" }}
            render={({ field }) => (
              <FormControl fullWidth sx={{ mt: 1 }}>
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
        )}

        {showCustomDuration && (
          <Controller
            name="customDuration"
            control={control}
            rules={{
              required: "Custom duration is required",
              min: { value: 0, message: "Duration must be at least 0" },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                type="number"
                label="Custom Duration (status ends)"
                error={!!errors.customDuration}
                helperText={errors.customDuration?.message}
                sx={{ mt: 1 }}
              />
            )}
          />
        )}

        <Controller
          name="useDateExpiration"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={<Checkbox {...field} checked={field.value} />}
              label="Expires on specific date"
              sx={{ mt: 2 }}
            />
          )}
        />

        {useDateExpiration && (
          <Controller
            name="expirationDate"
            control={control}
            rules={{
              required: "Expiration date is required when date expiration is enabled",
              validate: (value) => {
                const selectedDate = new Date(value)
                const now = new Date()
                return selectedDate > now || "Expiration date must be in the future"
              },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                type="datetime-local"
                label="Expires At"
                error={!!errors.expirationDate}
                helperText={errors.expirationDate?.message || "Select when this mark should expire"}
                InputLabelProps={{ shrink: true }}
                sx={{ mt: 1 }}
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
