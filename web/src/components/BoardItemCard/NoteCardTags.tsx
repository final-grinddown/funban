import { memo } from "react"
import { CardMedia, Typography } from "@mui/material"
import { alpha } from "@mui/material/styles"
import { tagColor } from "@/utils/noteConstants"

interface Props {
  tag: string | null
}

/**
 * Component for displaying note tags (modifiers like Important, Deadline, etc.)
 *
 * Memoized to prevent re-renders when tag hasn't changed.
 */
export const NoteCardTags = memo(function NoteCardTags({ tag }: Props) {
  if (!tag) return null

  return (
    <CardMedia
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: alpha(tagColor[tag], 0.75),
        p: 0.5,
      }}
    >
      <Typography>{tag}</Typography>
    </CardMedia>
  )
})
