import { useEffect, useState } from "react"
import { Checkbox, FormControl, FormControlLabel, InputLabel, MenuItem, Select, TextField } from "@mui/material"
import { Controller, useForm } from "react-hook-form"
import { requiredSelectRules } from "@/hooks/useFormValidation"
import { User } from "@/utils/interfaces"
import { BaseModal } from "./BaseModal"

interface Props {
  users: User[]
  isOpen: boolean
  onClose: () => void
  selectedUserId?: number
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
  { value: "1", label: "Current status (1)" },
  { value: "2", label: "Until next (2)" },
  { value: "5", label: "For a week (5)" },
  { value: "custom", label: "Custom count" },
]

export function AddUserMarkModal({ users, isOpen, onClose, selectedUserId, onSubmit }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isValid },
  } = useForm<FormInputs>({
    defaultValues: {
      userId: "",
      markType: "",
      useStandupExpiration: false,
      duration: "",
      customDuration: "",
      useDateExpiration: false,
      expirationDate: "",
      customText: "",
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

    reset()
    setIsSubmitting(false)
    onClose()
  }

  // Pre-select user when modal opens
  useEffect(() => {
    if (isOpen && selectedUserId) {
      reset({
        userId: selectedUserId.toString(),
        markType: "",
        useStandupExpiration: false,
        duration: "",
        customDuration: "",
        useDateExpiration: false,
        expirationDate: "",
        customText: "",
      })
    }
  }, [isOpen, selectedUserId, reset])

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add User Mark"
      primaryButtonText="Add Mark"
      primaryButtonAction={handleSubmit(handleFormSubmit)}
      primaryButtonDisabled={isSubmitting || !isValid}
      primaryButtonLoading={isSubmitting}
      primaryButtonWidth="120px"
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
              min: { value: 1, message: "Duration must be at least 1" },
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
