import { Backdrop, CircularProgress } from "@mui/material"

interface Props {
  isInDashboard?: boolean
}

export function BackdropLoading({ isInDashboard = false }: Props) {
  return (
    <Backdrop open={true} sx={{ ml: isInDashboard ? { lg: "250px" } : 0 }}>
      <CircularProgress color="primary" />
    </Backdrop>
  )
}
