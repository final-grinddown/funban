import type { StateCreator } from "zustand"
import type { User, Note } from "@/utils/interfaces"

export interface BoardSlice {
	board: {
		users: User[]
		notes: Note[]
		isLoading: boolean
		setUsers: (users: User[]) => void
		setNotes: (notes: Note[]) => void
		addUser: (user: User) => void
		updateUser: (userId: number, updates: Partial<User>) => void
		removeUser: (userId: number) => void
		addUserMark: (userId: number, mark: User["marks"][0]) => void
		updateUserMark: (userId: number, markId: number, mark: User["marks"][0]) => void
		removeUserMark: (userId: number, markId: number) => void
		addNote: (note: Note) => void
		updateNote: (noteId: number, updates: Partial<Note>) => void
		removeNote: (noteId: number) => void
		setLoading: (loading: boolean) => void
	}
}

export const createBoardSlice: StateCreator<BoardSlice> = (set) => ({
	board: {
		users: [],
		notes: [],
		isLoading: false,

		setUsers: (users) =>
			set((state) => ({
				board: { ...state.board, users },
			})),

		setNotes: (notes) =>
			set((state) => ({
				board: { ...state.board, notes },
			})),

		addUser: (user) =>
			set((state) => ({
				board: {
					...state.board,
					users: [...state.board.users, user],
				},
			})),

		updateUser: (userId, updates) =>
			set((state) => ({
				board: {
					...state.board,
					users: state.board.users.map((user) => (user.id === userId ? { ...user, ...updates } : user)),
					// Also update notes if user name/color changed
					notes:
						updates.name || updates.color
							? state.board.notes.map((note) =>
									note.owner_id === userId
										? {
												...note,
												...(updates.name && { name: updates.name }),
												...(updates.color && { color: updates.color }),
										  }
										: note,
							  )
							: state.board.notes,
				},
			})),

		removeUser: (userId) =>
			set((state) => ({
				board: {
					...state.board,
					users: state.board.users.filter((user) => user.id !== userId),
					// Also remove notes owned by this user
					notes: state.board.notes.filter((note) => note.owner_id !== userId),
				},
			})),

		addUserMark: (userId, mark) =>
			set((state) => ({
				board: {
					...state.board,
					users: state.board.users.map((user) =>
						user.id === userId ? { ...user, marks: [...user.marks, mark] } : user,
					),
				},
			})),

		updateUserMark: (userId, markId, mark) =>
			set((state) => ({
				board: {
					...state.board,
					users: state.board.users.map((user) =>
						user.id === userId
							? { ...user, marks: user.marks.map((m) => (m.id === markId ? mark : m)) }
							: user,
					),
				},
			})),

		removeUserMark: (userId, markId) =>
			set((state) => ({
				board: {
					...state.board,
					users: state.board.users.map((user) =>
						user.id === userId ? { ...user, marks: user.marks.filter((m) => m.id !== markId) } : user,
					),
				},
			})),

		addNote: (note) =>
			set((state) => ({
				board: {
					...state.board,
					notes: [...state.board.notes, note],
				},
			})),

		updateNote: (noteId, updates) =>
			set((state) => ({
				board: {
					...state.board,
					notes: state.board.notes.map((note) => (note.id === noteId ? { ...note, ...updates } : note)),
				},
			})),

		removeNote: (noteId) =>
			set((state) => ({
				board: {
					...state.board,
					notes: state.board.notes.filter((note) => note.id !== noteId),
				},
			})),

		setLoading: (loading) =>
			set((state) => ({
				board: { ...state.board, isLoading: loading },
			})),
	},
})
