import { Alert, Snackbar } from "@mui/material"
import { useActionStateStore } from "@/utils/store"

export function Alerts() {
  const { visibleAction, close } = useActionStateStore()

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
