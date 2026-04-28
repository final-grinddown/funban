import type { StateCreator } from "zustand"

export interface FocusSlice {
  focus: {
    isFocus: boolean
    currentUser: string
    setIsFocus: (focus: boolean) => void
    setCurrentUser: (user: string) => void
  }
}

export const createFocusSlice: StateCreator<FocusSlice> = (set) => ({
  focus: {
    isFocus: false,
    currentUser: "",
    setIsFocus: (focus) =>
      set((state) => ({
        focus: { ...state.focus, isFocus: focus },
      })),
    setCurrentUser: (user) =>
      set((state) => ({
        focus: { ...state.focus, currentUser: user },
      })),
  },
})
