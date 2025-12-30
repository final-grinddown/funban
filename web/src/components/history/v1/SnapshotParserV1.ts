import { base64DecodeUnicode, normalizeNotes } from "@/utils/helpers"
import type { IRawNote } from "@/utils/interfaces"
import type { ParsedSnapshot, SnapshotUser, SnapshotNote } from "@/utils/snapshot-types"

export class SnapshotParserV1 {
  static parse(rawSnapshot: string): ParsedSnapshot {
    const parsedSnapshot = JSON.parse(base64DecodeUnicode(rawSnapshot))

    // V1 format is just an array of notes (could be the snapshot itself or data.notes)
    const notes: IRawNote[] = Array.isArray(parsedSnapshot) ? parsedSnapshot : parsedSnapshot.notes || []

    const normalizedNotes = normalizeNotes(notes)

    // Derive users from notes (existing logic)
    const userMap = new Map<number, SnapshotUser>()

    normalizedNotes.forEach((note) => {
      if (!userMap.has(note.owner_id)) {
        userMap.set(note.owner_id, {
          id: note.owner_id,
          name: note.name,
          color: note.color,
          marks: [], // V1 has no marks
        })
      }
    })

    const users = Array.from(userMap.values())

    // Convert notes to snapshot format
    const snapshotNotes: SnapshotNote[] = normalizedNotes.map((note) => {
      // Normalize tag to capitalize first letter, rest lowercase (e.g., "QUICK" -> "Quick")
      const normalizedTag = note.tag ? note.tag.charAt(0).toUpperCase() + note.tag.slice(1).toLowerCase() : null
      return {
        id: note.id,
        text: note.text,
        name: note.name,
        owner_id: note.owner_id,
        color: note.color,
        state: note.state,
        predecessor_id: note.predecessor_id,
        updated: note.updated,
        created: note.created,
        tag: normalizedTag,
      }
    })

    return {
      users,
      notes: snapshotNotes,
    }
  }
}
