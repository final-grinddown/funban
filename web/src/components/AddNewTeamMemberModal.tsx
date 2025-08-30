import { useEffect } from "react"
import CloseIcon from "@mui/icons-material/Close"
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  RadioGroup,
  TextField,
  Typography,
} from "@mui/material"
import { Controller, useForm, useWatch } from "react-hook-form"
import { availableColors } from "@/utils/constants"

interface Props {
  isOpen: boolean
  existingNames: string[]
  onClose: () => void
  onSave: (name: string, color: string) => void
  isSubmitting: boolean
}

interface FormInputs {
  name: string
  color: string
}

export function AddNewTeamMemberModal({ isOpen, existingNames, onClose, onSave, isSubmitting }: Props) {
  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isValid },
  } = useForm<FormInputs>({
    defaultValues: { name: "", color: availableColors[0].name },
    mode: "onChange",
  })

  const selectedColor = useWatch({
    control,
    name: "color",
  })

  const onSubmit = (data: FormInputs) => {
    onSave(data.name, data.color)
  }

  useEffect(() => {
    if (isOpen) {
      reset({ name: "", color: availableColors[0].name })
    }
  }, [isOpen, reset])

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth={true}>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 0 }}>
        Add New Team Member
        <IconButton
          aria-label="close"
          edge="end"
          onClick={onClose}
          sx={{
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Typography variant="subtitle1" sx={{ mt: 2 }}>
            Set Unique Name
          </Typography>
          <Controller
            name="name"
            control={control}
            rules={{
              required: "Name is required.",
              maxLength: { value: 20, message: "Name cannot exceed 20 characters." },
              validate: {
                noLeadingSpaces: (value) => !/^\s/.test(value) || "Name cannot start with a space.",
                uniqueName: (value) =>
                  !existingNames.includes(value) || "Name already exists. Please choose a different name.",
              },
            }}
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                label="Name"
                variant="outlined"
                size="small"
                fullWidth={true}
                error={!!error}
                helperText={error ? error.message : ""}
                sx={{ mt: 1 }}
              />
            )}
          />

          <Typography variant="subtitle1" sx={{ mt: { xs: 6, sm: 3 } }}>
            Set Color: <strong>{selectedColor}</strong>
          </Typography>
          <Controller
            name="color"
            control={control}
            render={({ field }) => (
              <RadioGroup {...field}>
                <Grid container spacing={2}>
                  {availableColors.map(({ name, value }) => (
                    <Grid item xs={6} sm={4} md={3} lg={3} key={name}>
                      <Box
                        component="div"
                        width="100%"
                        height={60}
                        bgcolor={value}
                        border="2px solid rgba(0, 0, 0, 0.12)"
                        borderRadius={2}
                        display="flex"
                        justifyContent="center"
                        alignItems="center"
                        sx={{
                          cursor: "pointer",
                          opacity: name === field.value ? 1 : 0.25,
                          transition: "opacity 0.3s",
                          "&:hover": {
                            opacity: 1,
                          },
                        }}
                        onClick={() => setValue("color", name)}
                      />
                    </Grid>
                  ))}
                </Grid>
              </RadioGroup>
            )}
          />
        </form>
      </DialogContent>
      <DialogActions sx={{ px: 3, alignItems: "stretch" }}>
        <Button onClick={onClose} color="secondary" variant="contained">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          color="primary"
          variant="contained"
          disabled={isSubmitting || !isValid}
          sx={{ width: "72px" }}
        >
          {isSubmitting ? <CircularProgress size={20} /> : "Add"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
