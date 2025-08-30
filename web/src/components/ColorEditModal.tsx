import { useEffect, useState } from "react"
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
  Typography,
} from "@mui/material"

interface Props {
  isOpen: boolean
  currentColor: string
  availableColors: { name: string; value: string }[]
  onClose: () => void
  onSave: (newColor: string) => void
  isSubmitting: boolean
}

export function ColorEditModal({ isOpen, currentColor, availableColors, onClose, onSave, isSubmitting }: Props) {
  const [selectedColor, setSelectedColor] = useState(currentColor)

  const handleSave = () => {
    onSave(selectedColor)
  }

  useEffect(() => {
    if (isOpen) {
      setSelectedColor(currentColor)
    }
  }, [currentColor, isOpen])

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth={true}>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        Edit Color
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
        <Box display="flex" gap={1} alignItems="center" mb={1}>
          <Typography variant="h6" component="p" color="text.primary" gutterBottom={false}>
            Current color:
          </Typography>
          <Typography variant="h6" component="p" fontWeight="normal">
            {selectedColor}
          </Typography>
        </Box>
        <RadioGroup value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)}>
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
                    opacity: name === selectedColor ? 1 : 0.25, // Dim the color if not selected
                    transition: "opacity 0.3s", // Smooth transition for opacity
                    "&:hover": {
                      opacity: 1, // Restore full opacity on hover
                    },
                  }}
                  onClick={() => setSelectedColor(name)}
                />
              </Grid>
            ))}
          </Grid>
        </RadioGroup>
      </DialogContent>
      <DialogActions sx={{ px: 3, alignItems: "stretch" }}>
        <Button onClick={onClose} color="secondary" variant="contained">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          color="primary"
          variant="contained"
          disabled={isSubmitting || selectedColor === currentColor}
          sx={{ width: "72px" }}
        >
          {isSubmitting ? <CircularProgress size={20} /> : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
