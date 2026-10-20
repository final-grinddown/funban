import { Chip } from "@mui/material"
import { Release } from "@/utils/interfaces"

interface Props {
  release: Pick<Release, "closed_at">
}

export function ReleaseStatusChip({ release }: Props) {
  return release.closed_at ? (
    <Chip label="Closed" size="small" variant="outlined" />
  ) : (
    <Chip label="Open" size="small" color="success" variant="outlined" />
  )
}
