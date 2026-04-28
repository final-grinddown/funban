import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { createActionSlice, type ActionSlice } from "./slices/actionSlice"
import { createBoardSlice, type BoardSlice } from "./slices/boardSlice"
import { createFocusSlice, type FocusSlice } from "./slices/focusSlice"
import { createModalSlice, type ModalSlice } from "./slices/modalSlice"
import { createThemeSlice, type ThemeSlice } from "./slices/themeSlice"
import { createUiSlice, type UiSlice } from "./slices/uiSlice"

// Combined app state type
export type AppState = BoardSlice & ModalSlice & FocusSlice & ThemeSlice & ActionSlice & UiSlice

// Create the unified store
export const useAppStore = create<AppState>()(
  devtools(
    (...args) => ({
      ...createBoardSlice(...args),
      ...createModalSlice(...args),
      ...createFocusSlice(...args),
      ...createThemeSlice(...args),
      ...createActionSlice(...args),
      ...createUiSlice(...args),
    }),
    { name: "FunbanStore" },
  ),
)

// Convenience selectors for common use cases
export const selectUsers = (state: AppState) => state.board.users
export const selectNotes = (state: AppState) => state.board.notes
export const selectIsFocus = (state: AppState) => state.focus.isFocus
export const selectCurrentUser = (state: AppState) => state.focus.currentUser
export const selectThemeMode = (state: AppState) => state.theme.mode
export const selectIsAnyModalOpen = (state: AppState) => state.modals.isAnyModalOpen()

// Re-export types for convenience
export type { ModalName } from "./slices/modalSlice"
