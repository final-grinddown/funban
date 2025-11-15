/**
 * Constants related to note cards and their display
 */

/** Storage key for header configuration preference */
export const HEADER_CONFIG_KEY = "funban-header-config"

/** Allowed tag modifiers for notes */
export const allowedModifiers = ["Important", "Deadline", "Waiting", "Quick"] as const

/** Color mapping for note tags */
export const tagColor: Record<string, string> = {
  Important: "#f44336",
  Deadline: "#000000",
  Waiting: "#ff9800",
  Quick: "#4caf50",
}

/** Type for allowed modifiers */
export type NoteModifier = (typeof allowedModifiers)[number]
