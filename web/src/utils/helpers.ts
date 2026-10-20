import type { BaseSyntheticEvent, KeyboardEvent } from "react"
import { format, formatDistanceToNow } from "date-fns"
import { TThemeMode } from "@/utils/types"
import { ErrorWithCode, Note, IRawNote } from "./interfaces"

const PROJECT_PREFIX = "funban-"

/**
 * Creates a prefixed key by appending the given key to the project prefix.
 *
 * @param key - The key to be prefixed.
 * @returns The key with the project-specific prefix.
 */
export function createPrefixedKey(key: string): string {
  return `${PROJECT_PREFIX}${key}`
}

/**
 * Checks if a given value is a valid TThemeMode ("light" or "dark").
 *
 * @param value - The value to be checked.
 * @returns True if the value is "light" or "dark", otherwise false.
 */
export function isThemeMode(value: unknown): value is TThemeMode {
  return value === "light" || value === "dark"
}

/**
 * Matches a given color name against a list of available colors and returns the corresponding color value.
 *
 * This function normalizes the input color name and the names of the available colors by converting them
 * to lowercase and replacing spaces with underscores. It then attempts to find a match in the list
 * of available colors.
 *
 * @param color - The color name to match.
 * @param availableColors - An array of objects representing the available colors, where each object
 *                          contains a 'name' and a 'value' property.
 * @returns The color value (e.g., a hex code) if a match is found, otherwise undefined.
 */
export function matchColorName(color: string, availableColors: readonly { name: string; value: string }[]) {
  if (!color) return undefined
  const normalizedColor = color.toLowerCase().replace(/ /g, "_")

  const matchedColor = availableColors.find((c) => {
    const normalizedAvailableColor = c.name.toLowerCase().replace(/ /g, "_")
    return normalizedAvailableColor === normalizedColor
  })

  return matchedColor?.value
}

/**
 * Normalizes an array of notes by converting them into the Note interface structure.
 *
 * This function takes an array of raw note objects (which may have a different structure)
 * and converts them to match the Note interface. It ensures that the note IDs and owner IDs
 * are numbers, and that the owner details (name and color) are directly accessible in the resulting
 * Note objects.
 *
 * @param notes - An array of raw note objects that may not conform to the Note interface.
 * @returns An array of normalized notes conforming to the Note interface.
 */
export function normalizeNotes(notes: IRawNote[]): Note[] {
  return notes.map((note) => ({
    id: Number(note.id),
    text: note.text,
    name: note.owner.name,
    owner_id: Number(note.owner.id),
    color: note.owner.color,
    state: note.state,
    predecessor_id: note.predecessor_id ? Number(note.predecessor_id) : null,
    updated: note.updated,
    created: note.created,
    tag: (note.tag || null) as Note["tag"],
  }))
}

/**
 * Encodes a string into Base64 format while preserving Unicode characters.
 *
 * Uses TextEncoder to properly handle Unicode characters, converting them to
 * the correct binary representation before Base64 encoding.
 *
 * @param str - The string to be encoded in Base64 format.
 * @returns The Base64 encoded string.
 */
export function base64EncodeUnicode(str: string): string {
  // Convert string to UTF-8 encoded bytes
  const bytes = new TextEncoder().encode(str)
  // Convert Uint8Array to regular array for apply
  const binaryStr = String.fromCharCode.apply(null, Array.from(bytes))
  return btoa(binaryStr)
}

/**
 * Decodes a Base64 string that was encoded with Unicode characters preserved.
 *
 * Uses TextDecoder to properly handle Unicode characters from the binary data,
 * ensuring correct reconstruction of multi-byte characters.
 *
 * @param str - The Base64 encoded string to be decoded.
 * @returns The original string with Unicode characters preserved.
 */
export function base64DecodeUnicode(str: string): string {
  const binaryStr = atob(str)
  // Convert binary string to Uint8Array
  const bytes = Uint8Array.from(binaryStr, (char) => char.charCodeAt(0))
  // Use TextDecoder to properly handle Unicode
  return new TextDecoder().decode(bytes)
}

/**
 * Handles the keydown event for a div element, triggering a submit action if Shift+Enter is pressed.
 *
 * This function checks if the Shift key is pressed along with the Enter key, and if so, it prevents
 * the default action and stops the event propagation. It then calls the handleSubmit function with
 * the onSubmit function as an argument to trigger the submit action.
 *
 * @param event - The keydown event object for the div element.
 * @param handleSubmit - The function that returns a submit handler function when called with onSubmit.
 * @param onSubmit - The submit handler function to be called when Shift+Enter is pressed.
 * @param isDisabled - A boolean value indicating whether the submit action is disabled.
 */
export function handleKeyDownSubmit<T>(
  event: KeyboardEvent<HTMLDivElement>,
  handleSubmit: (onSubmit: (data: T) => void) => (e?: BaseSyntheticEvent) => void,
  onSubmit: (data: T) => void,
  isDisabled: boolean,
) {
  if (event.shiftKey && event.key === "Enter" && !isDisabled) {
    event.preventDefault()
    event.stopPropagation()
    handleSubmit(onSubmit)()
  }
}

/**
 * Formats the created and updated dates of a note into a user-friendly string format.
 *
 * This function takes the created and updated dates of a note and formats them into a string
 * that includes both the date and time in the format "dd/MM/yyyy, HH:mm". It also generates
 * a relative time string using the formatDistanceToNow function from date-fns, which returns
 * a human-readable string representing the time elapsed since the given date.
 *
 * @param created - The created date of the note in ISO 8601 format.
 * @param updated - The updated date of the note in ISO 8601 format.
 */
export const formatDateToShow = (created: string, updated: string) => {
  const updatedDate = format(new Date(updated), "dd/MM/yyyy, HH:mm")
  const createdDate = format(new Date(created), "dd/MM/yyyy, HH:mm")
  const updatedRelative = formatDistanceToNow(new Date(updated), { addSuffix: true })
  const createdRelative = formatDistanceToNow(new Date(created), { addSuffix: true })

  return { updatedDate, createdDate, updatedRelative, createdRelative }
}

export function hasCode(obj: unknown): obj is ErrorWithCode {
  return (
    (obj as ErrorWithCode)?.code !== undefined &&
    (obj as ErrorWithCode)?.message !== undefined &&
    typeof (obj as ErrorWithCode).code === "string" &&
    typeof (obj as ErrorWithCode).message === "string"
  )
}
