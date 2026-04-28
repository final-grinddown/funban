import { memo } from "react"
import { CardHeader, Typography } from "@mui/material"
import { alpha } from "@mui/material/styles"
import { DevSettings } from "@/utils/interfaces"

interface Props {
  name: string
  id: number
  predecessor_id: number | null
  matchedColor: string
  contrastColor: string
  devSettings: DevSettings
  dateToShow?: string
  createdDate?: string
  createdRelative?: string
  updatedDate?: string
  updatedRelative?: string
  updated?: string
  created?: string
  isEditable: boolean
  headerConfig: string
}

/**
 * Header component for note cards.
 * Displays the note owner's name and timestamp information.
 *
 * Memoized to prevent re-renders when note metadata hasn't changed.
 */
export const NoteCardHeader = memo(function NoteCardHeader({
  name,
  id,
  predecessor_id,
  matchedColor,
  contrastColor,
  devSettings,
  dateToShow,
  createdDate,
  createdRelative,
  updatedDate,
  updatedRelative,
  updated,
  created,
  isEditable,
  headerConfig,
}: Props) {
  return (
    <CardHeader
      title={
        <Typography
          variant="h6"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: alpha(contrastColor, 0.85),
          }}
        >
          {name} {devSettings.ids ? ` (${id})` : ""}
          {devSettings.predecessors ? ` (^${predecessor_id})` : ""}
        </Typography>
      }
      subheader={
        <>
          {headerConfig === "updated_only" && (
            <Typography variant="body2" sx={{ color: alpha(contrastColor, 0.7) }}>
              {dateToShow}
            </Typography>
          )}
          {headerConfig === "created_updated" && (
            <>
              <Typography variant="body2" sx={{ color: alpha(contrastColor, 0.7) }}>
                {isEditable ? `Created ${createdRelative}` : `Created at ${createdDate}`}
              </Typography>
              {updated && (
                <Typography variant="body2" sx={{ color: alpha(contrastColor, 0.7) }}>
                  {updated !== created
                    ? isEditable
                      ? `Updated ${updatedRelative}`
                      : `Updated at ${updatedDate}`
                    : "N/A"}
                </Typography>
              )}
            </>
          )}
        </>
      }
      action={null}
      sx={{
        bgcolor: alpha(matchedColor, 0.75),
      }}
    />
  )
})
