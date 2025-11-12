import type { StateCreator } from "zustand"

export type ModalName =
	| "addNewNote"
	| "editNote"
	| "deleteNote"
	| "splitNote"
	| "deleteNoteBulk"
	| "endStatus"
	| "addUserMark"
	| "editUserMark"
	| "changePassword"
	| "changeEmail"
	| "nameEdit"
	| "colorEdit"

export interface ModalState {
	isOpen: boolean
	data?: any
}

export interface ModalSlice {
	modals: {
		[K in ModalName]: ModalState
	} & {
		openModal: <T = any>(modalName: ModalName, data?: T) => void
		closeModal: (modalName: ModalName) => void
		isAnyModalOpen: () => boolean
	}
}

const initialModalState: ModalState = {
	isOpen: false,
	data: undefined,
}

export const createModalSlice: StateCreator<ModalSlice> = (set, get) => ({
	modals: {
		addNewNote: initialModalState,
		editNote: initialModalState,
		deleteNote: initialModalState,
		splitNote: initialModalState,
		deleteNoteBulk: initialModalState,
		endStatus: initialModalState,
		addUserMark: initialModalState,
		editUserMark: initialModalState,
		changePassword: initialModalState,
		changeEmail: initialModalState,
		nameEdit: initialModalState,
		colorEdit: initialModalState,

		openModal: (modalName, data) =>
			set((state) => ({
				modals: {
					...state.modals,
					[modalName]: {
						isOpen: true,
						data,
					},
				},
			})),

		closeModal: (modalName) =>
			set((state) => ({
				modals: {
					...state.modals,
					[modalName]: initialModalState,
				},
			})),

		isAnyModalOpen: () => {
			const state = get()
			return Object.keys(state.modals)
				.filter((key) => key !== "openModal" && key !== "closeModal" && key !== "isAnyModalOpen")
				.some((key) => state.modals[key as ModalName].isOpen)
		},
	},
})
