import { Alert, Snackbar } from "@mui/material"
import { useAppStore } from "@/store"

export function Alerts() {
  const { visibleAction, close, visibleError, closeError } = useAppStore((state) => state.actions)

  return (
    <>
      <Snackbar open={visibleAction !== null} autoHideDuration={6000} onClose={close}>
        <Alert onClose={close} severity="success" variant="filled" sx={{ width: "100%" }}>
          {visibleAction}
        </Alert>
      </Snackbar>
      <Snackbar open={visibleError !== null} autoHideDuration={8000} onClose={closeError}>
        <Alert onClose={closeError} severity="error" variant="filled" sx={{ width: "100%" }}>
          {visibleError}
        </Alert>
      </Snackbar>
    </>
  )
}
