import { useMemo } from "react"
import { Note } from "@/utils/interfaces"

/**
 * Custom hook for sorting notes based on their linked-list predecessor structure.
 *
 * Notes are organized in a linked-list structure where each note can reference
 * a predecessor via `predecessor_id`. This hook traverses these chains to produce
 * a sorted array of notes in the correct order.
 *
 * Algorithm:
 * 1. Build a map of predecessor_id → note (successor map) for O(1) lookup
 * 2. Find all root notes (notes with no predecessor)
 * 3. For each root, traverse the linked list using the successor map
 * 4. Add any orphaned notes (not in a valid chain) at the end
 *
 * Time complexity: O(n) - single pass to build map, single pass to traverse
 * Space complexity: O(n) for the maps and visited set
 *
 * @param notes - Array of notes to sort
 * @returns Sorted array of notes following the linked-list order
 */
export function useNoteSorting(notes: Note[]): Note[] {
  return useMemo(() => {
    const successorMap = new Map<number, Note>()
    const sorted: Note[] = []
    const visited = new Set<number>()

    // Build predecessor_id → note mapping for O(1) successor lookup
    notes.forEach((note) => {
      if (note.predecessor_id !== null) {
        successorMap.set(note.predecessor_id, note)
      }
    })

    // Find roots (notes with no predecessor)
    const roots = notes.filter((note) => note.predecessor_id === null)

    // Traverse linked list for each root using O(1) successor lookups
    roots.forEach((root) => {
      let current: Note | undefined = root
      while (current && !visited.has(current.id)) {
        sorted.push(current)
        visited.add(current.id)

        // O(1) lookup of next note in the chain
        current = successorMap.get(current.id)
      }
    })

    // Add any orphaned notes (not in a valid chain)
    // This handles edge cases where notes might have invalid predecessor_id references
    const orphaned = notes.filter((note) => !visited.has(note.id))

    return [...sorted, ...orphaned]
  }, [notes])
}
