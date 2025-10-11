import { useEffect, useState } from "react"
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material"
import { Controller, useForm } from "react-hook-form"
import { requiredSelectRules } from "@/hooks/useFormValidation"
import { User } from "@/utils/interfaces"
import { BaseModal } from "./BaseModal"

interface Props {
  users: User[]
  isOpen: boolean
  onClose: () => void
  selectedUserId?: number
  onSubmit: (data: { userId: number; markType: string; duration: number; customText?: string; expiresAt?: string }) => void
}

interface FormInputs {
  userId: string
  markType: string
  durationType: string
  duration: string
  customDuration: string
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

const durationTypeOptions = [
  { value: "count", label: "Number of Standups" },
  { value: "date", label: "Specific Date" },
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
      durationType: "count",
      duration: "",
      customDuration: "",
      expirationDate: "",
      customText: "",
    },
    mode: "onChange",
  })

  const durationType = watch("durationType")
  const duration = watch("duration")
  const showCustomDuration = durationType === "count" && duration === "custom"
  const showDatePicker = durationType === "date"

  const handleFormSubmit = (data: FormInputs) => {
    setIsSubmitting(true)

    let finalDuration = 1
    let expiresAt: string | undefined

    if (data.durationType === "count") {
      finalDuration = data.duration === "custom"
        ? parseInt(data.customDuration, 10)
        : parseInt(data.duration, 10)
    } else if (data.durationType === "date") {
      // For date-based expiration, set counter to a large number (e.g., 999)
      // The date will be the primary expiration mechanism
      finalDuration = 999
      expiresAt = data.expirationDate ? new Date(data.expirationDate).toISOString() : undefined
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
        durationType: "count",
        duration: "",
        customDuration: "",
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
          name="durationType"
          control={control}
          rules={requiredSelectRules}
          render={({ field }) => (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel id="duration-type-label">Duration Type</InputLabel>
              <Select {...field} labelId="duration-type-label" label="Duration Type" error={!!errors.durationType}>
                {durationTypeOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        />

        {durationType === "count" && (
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
        )}

        {showCustomDuration && (
          <Controller
            name="customDuration"
            control={control}
            rules={{
              required: "Custom duration is required",
              min: { value: 1, message: "Duration must be at least 1" }
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

        {showDatePicker && (
          <Controller
            name="expirationDate"
            control={control}
            rules={{
              required: "Expiration date is required",
              validate: (value) => {
                const selectedDate = new Date(value)
                const now = new Date()
                return selectedDate > now || "Expiration date must be in the future"
              }
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
