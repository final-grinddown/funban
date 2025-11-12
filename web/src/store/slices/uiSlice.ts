import type { StateCreator } from "zustand"

export interface UiSlice {
	ui: {
		draggingItemId: string | null
		hoveredColumn: string | null
		setDraggingItemId: (id: string | null) => void
		setHoveredColumn: (column: string | null) => void
	}
}

export const createUiSlice: StateCreator<UiSlice> = (set) => ({
	ui: {
		draggingItemId: null,
		hoveredColumn: null,
		setDraggingItemId: (id) =>
			set((state) => ({
				ui: { ...state.ui, draggingItemId: id },
			})),
		setHoveredColumn: (column) =>
			set((state) => ({
				ui: { ...state.ui, hoveredColumn: column },
			})),
	},
})
