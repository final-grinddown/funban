import { MouseEvent, useMemo, useState } from "react"
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents"
import {
  Box,
  Button,
  Popover,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material"
import { Release } from "@/utils/interfaces"
import { buildReleaseLeaderboard, LeaderboardEntry } from "@/utils/release"

interface Props {
  releases: Pick<Release, "assignee_id" | "assignee_name" | "deployed_by_us" | "release_at">[]
}

type Period = "year" | "all"

const medals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" }

function countTooltip(entry: LeaderboardEntry): string {
  const releases = `${entry.total} ${entry.total === 1 ? "release" : "releases"}`
  return entry.overseen > 0 ? `${releases}, ${entry.overseen} of them only overseen` : releases
}

/**
 * Release count with the number of only-overseen releases in brackets, e.g. `11 (3)`
 */
function LeaderboardCount({ entry }: { entry: LeaderboardEntry }) {
  return (
    <Tooltip title={countTooltip(entry)}>
      <span>
        {entry.total}
        {entry.overseen > 0 && (
          <Typography component="span" variant="inherit" color="textSecondary">
            {" "}
            ({entry.overseen})
          </Typography>
        )}
      </span>
    </Tooltip>
  )
}

/**
 * Top three release assignees of the current year, opening the full ranking on click
 */
export function ReleaseLeaderboard({ releases }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [period, setPeriod] = useState<Period>("year")
  const currentYear = new Date().getFullYear()

  const yearEntries = useMemo(() => buildReleaseLeaderboard(releases, currentYear), [releases, currentYear])
  const allEntries = useMemo(() => buildReleaseLeaderboard(releases, null), [releases])
  const entries = period === "year" ? yearEntries : allEntries

  if (allEntries.length === 0) return null

  const handleOpen = (event: MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget)
  const handleClose = () => setAnchorEl(null)
  const handlePeriodChange = (_: MouseEvent<HTMLElement>, value: Period | null) => {
    if (value) setPeriod(value)
  }

  return (
    <>
      <Button
        color="inherit"
        onClick={handleOpen}
        startIcon={<EmojiEventsIcon />}
        sx={{ textTransform: "none", gap: 2 }}
        aria-label="Release leaderboard"
      >
        {yearEntries.length === 0 ? (
          <Typography color="textSecondary">No releases this year yet</Typography>
        ) : (
          yearEntries
            .filter((entry) => entry.rank <= 3)
            .map((entry) => (
              <Box component="span" key={entry.assigneeId} sx={{ whiteSpace: "nowrap" }}>
                {medals[entry.rank]} {entry.name} <LeaderboardCount entry={entry} />
              </Box>
            ))
        )}
      </Button>

      <Popover
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Box sx={{ p: 2, minWidth: 320 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, mb: 1 }}>
            <Typography variant="h6" component="h2">
              Leaderboard
            </Typography>
            <ToggleButtonGroup size="small" exclusive value={period} onChange={handlePeriodChange}>
              <ToggleButton value="year">{currentYear}</ToggleButton>
              <ToggleButton value="all">All time</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {entries.length === 0 ? (
            <Typography color="textSecondary">No assigned releases in {currentYear} yet.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Assignee</TableCell>
                  <TableCell align="right">Releases</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.assigneeId} sx={{ "&:last-child td": { border: 0 } }}>
                    <TableCell>{medals[entry.rank] ?? entry.rank}</TableCell>
                    <TableCell>{entry.name}</TableCell>
                    <TableCell align="right">
                      <LeaderboardCount entry={entry} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Typography variant="caption" color="textSecondary" component="p" sx={{ mt: 1 }}>
            Number in brackets: releases we only oversaw.
          </Typography>
        </Box>
      </Popover>
    </>
  )
}
