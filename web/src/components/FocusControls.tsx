import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import ArrowForwardIcon from "@mui/icons-material/ArrowForward"
import CheckIcon from "@mui/icons-material/Check"
import { Box, Fab, Zoom } from "@mui/material"

interface FocusControlsProps {
  onPrevUser: () => void
  onNextUser: () => void
  onEndFocus: () => void
  isFocus: boolean
}

export function FocusControls({ onPrevUser, onNextUser, onEndFocus, isFocus }: FocusControlsProps) {
  return (
    <Zoom in={isFocus} timeout={{ enter: 350, exit: 500 }} unmountOnExit>
      <Box
        className="mui-fixed"
        display="flex"
        flexWrap="wrap"
        justifyContent={{ xs: "center", sm: "flex-end" }}
        width="100%"
        gap={2}
        pr={2}
        right={{ xs: "auto", sm: 20 }}
        bottom={20}
        position="fixed"
      >
        <Fab variant="extended" onClick={onPrevUser}>
          <ArrowBackIcon fontSize="small" sx={{ mr: 1 }} />
          Prev user
        </Fab>
        <Fab variant="extended" onClick={onNextUser}>
          <ArrowForwardIcon fontSize="small" sx={{ mr: 1 }} />
          Next user
        </Fab>
        <Fab variant="extended" color="success" onClick={onEndFocus}>
          <CheckIcon fontSize="small" sx={{ mr: 1 }} />
          End focus
        </Fab>
      </Box>
    </Zoom>
  )
}
