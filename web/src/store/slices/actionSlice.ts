import type { StateCreator } from "zustand"

type Action = {
	id: string
	message: string
}

export interface ActionSlice {
	actions: {
		visibleAction: string | null
		asyncQueue: Action[]
		startAsync: (id: string, message: string) => void
		finishAsync: (id: string) => void
		fire: (message: string) => void
		close: () => void
	}
}

export const createActionSlice: StateCreator<ActionSlice> = (set) => ({
	actions: {
		visibleAction: null,
		asyncQueue: [],
		startAsync: (id, message) =>
			set((state) => ({
				actions: {
					...state.actions,
					asyncQueue: [...state.actions.asyncQueue, { id, message }],
				},
			})),
		finishAsync: (id) =>
			set((state) => {
				const found = state.actions.asyncQueue.find((action) => action.id === id)
				return {
					actions: {
						...state.actions,
						asyncQueue: state.actions.asyncQueue.filter((action) => action.id !== id),
						visibleAction: found?.message || null,
					},
				}
			}),
		fire: (message) =>
			set((state) => ({
				actions: { ...state.actions, visibleAction: message },
			})),
		close: () =>
			set((state) => ({
				actions: { ...state.actions, visibleAction: null },
			})),
	},
})
