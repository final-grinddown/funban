import { format, isValid, parseISO } from "date-fns"
import type { Release, ReleaseType } from "@/utils/interfaces"

export const releaseTypeLabels: Record<ReleaseType, string> = {
  application: "Application",
  maintenance: "Maintenance",
}

export const releaseTypeColors: Record<ReleaseType, "primary" | "secondary"> = {
  application: "primary",
  maintenance: "secondary",
}

export function deploymentLabel(deployedByUs: boolean): string {
  return deployedByUs ? "We deploy" : "We only oversee"
}

export const ReleaseCodeMaxLength = 32
export const CloseSummaryMaxLength = 2000
export const DefaultCloseSummary = "No problems during the release. Done."

/**
 * Formats the server's naive local datetime (e.g. `2026-10-20T14:00:00`) for display
 */
export function formatReleaseAt(value: string): string {
  const date = parseISO(value)
  return isValid(date) ? format(date, "d MMM yyyy, HH:mm") : value
}

/**
 * Converts the server's datetime into the `datetime-local` input format (`YYYY-MM-DDTHH:mm`)
 */
export function toDateTimeInputValue(value: string): string {
  return value.slice(0, 16)
}

export interface LeaderboardEntry {
  assigneeId: number
  name: string
  /** Shared by people with the same total (1, 1, 3) */
  rank: number
  total: number
  /** Releases where the team only oversaw the deployment */
  overseen: number
  lastReleaseAt: string
}

/**
 * Ranks current team members by the number of releases assigned to them.
 * Pass `year` to count only releases happening in that calendar year, `null` for all time.
 * Unassigned releases and releases of former members are left out.
 */
export function buildReleaseLeaderboard(
  releases: Pick<Release, "assignee_id" | "assignee_name" | "deployed_by_us" | "release_at">[],
  year: number | null,
): LeaderboardEntry[] {
  const byAssignee = new Map<number, LeaderboardEntry>()

  for (const release of releases) {
    if (release.assignee_id === null || release.assignee_name === null) continue
    if (year !== null && !release.release_at.startsWith(`${year}-`)) continue

    const entry = byAssignee.get(release.assignee_id) ?? {
      assigneeId: release.assignee_id,
      name: release.assignee_name,
      rank: 0,
      total: 0,
      overseen: 0,
      lastReleaseAt: release.release_at,
    }
    entry.total += 1
    if (!release.deployed_by_us) entry.overseen += 1
    // Naive ISO datetimes compare correctly as strings
    if (release.release_at > entry.lastReleaseAt) entry.lastReleaseAt = release.release_at
    byAssignee.set(release.assignee_id, entry)
  }

  const entries = [...byAssignee.values()].sort(
    (a, b) => b.total - a.total || b.lastReleaseAt.localeCompare(a.lastReleaseAt),
  )
  entries.forEach((entry, index) => {
    const previous = entries[index - 1]
    entry.rank = previous && previous.total === entry.total ? previous.rank : index + 1
  })
  return entries
}
