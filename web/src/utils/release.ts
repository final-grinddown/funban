import { format, isValid, parseISO } from "date-fns"
import type { ReleaseType } from "@/utils/interfaces"

export const releaseTypeLabels: Record<ReleaseType, string> = {
  application: "Application",
  maintenance: "Maintenance",
}

export const releaseTypeColors: Record<ReleaseType, "primary" | "secondary"> = {
  application: "primary",
  maintenance: "secondary",
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
