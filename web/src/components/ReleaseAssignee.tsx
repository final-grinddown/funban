import { Typography } from "@mui/material"
import { Release } from "@/utils/interfaces"

interface Props {
  release: Pick<Release, "assignee_id" | "assignee_name">
}

/**
 * Shows the assignee, marking unassigned releases and people who have since left the team
 */
export function ReleaseAssignee({ release }: Props) {
  if (release.assignee_name === null) {
    return (
      <Typography component="span" variant="inherit" color="textSecondary" fontStyle="italic">
        Unassigned
      </Typography>
    )
  }

  if (release.assignee_id !== null) {
    return <>{release.assignee_name}</>
  }

  return (
    <>
      {release.assignee_name}{" "}
      <Typography component="span" variant="body2" color="textSecondary">
        (former member)
      </Typography>
    </>
  )
}
