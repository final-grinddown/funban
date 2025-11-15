import { Alert, Snackbar } from "@mui/material"
import { useAppStore } from "@/store"

export function Alerts() {
  const { visibleAction, close } = useAppStore((state) => state.actions)

  function handleSnackbarClose() {
    close()
  }

  return (
    <Snackbar open={visibleAction !== null} autoHideDuration={6000} onClose={handleSnackbarClose}>
      <Alert onClose={handleSnackbarClose} severity="success" variant="filled" sx={{ width: "100%" }}>
        {visibleAction}
      </Alert>
    </Snackbar>
  )
}
