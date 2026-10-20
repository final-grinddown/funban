import type { IRawNote } from "./interfaces"

// Common normalized format that all parsers output
export interface ParsedSnapshot {
  users: SnapshotUser[]
  notes: SnapshotNote[]
}

export interface SnapshotUser {
  id: number
  name: string
  color: string
  marks: SnapshotUserMark[]
}

export interface SnapshotUserMark {
  mark_type: string
  custom_text?: string
  expires_in: number
}

export interface SnapshotNote {
  id: number
  text: string
  name: string
  owner_id: number
  color: string
  state: string
  predecessor_id: number | null
  updated: string
  created: string
  tag: string | null
}

// Version-specific raw formats
export interface SnapshotV1Data {
  version?: 1 // Optional for backward compatibility
  // V1 is just an array of notes
  notes: IRawNote[]
}

export interface SnapshotV2Data {
  version: 2
  users: {
    id: number
    name: string
    color: string
    marks: SnapshotUserMark[]
  }[]
  notes: {
    id: number
    text: string
    owner_id: number
    state: string
    predecessor_id: number | null
    updated: string
    created: string
    tag: string | null
  }[]
}

export type VersionedSnapshotData = SnapshotV1Data | SnapshotV2Data

// Helper to detect snapshot version
export function getSnapshotVersion(rawSnapshot: string): 1 | 2 {
  try {
    const data = JSON.parse(rawSnapshot)
    return data.version || 1
  } catch {
    return 1
  }
}
