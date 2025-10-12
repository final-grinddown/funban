import { base64DecodeUnicode } from "@/utils/helpers"
import type { ParsedSnapshot, SnapshotUser, SnapshotNote, SnapshotV2Data } from "@/utils/snapshot-types"

export class SnapshotParserV2 {
	static parse(rawSnapshot: string): ParsedSnapshot {
		const decodedSnapshot = base64DecodeUnicode(rawSnapshot)
		const data: SnapshotV2Data = JSON.parse(decodedSnapshot)

		// V2 has users with marks directly
		const users: SnapshotUser[] = data.users.map(user => ({
			id: user.id,
			name: user.name,
			color: user.color,
			marks: user.marks || []
		}))

		// V2 notes reference owner_id, need to enrich with name/color from users
		const userMap = new Map(users.map(u => [u.id, u]))

		const notes: SnapshotNote[] = data.notes.map(note => {
			const owner = userMap.get(note.owner_id)
			return {
				id: note.id,
				text: note.text,
				name: owner?.name || 'Unknown',
				owner_id: note.owner_id,
				color: owner?.color || 'gray',
				state: note.state,
				predecessor_id: note.predecessor_id,
				updated: note.updated,
				created: note.created,
				tag: note.tag
			}
		})

		return {
			users,
			notes
		}
	}
}
