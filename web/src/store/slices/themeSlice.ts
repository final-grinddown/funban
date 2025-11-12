import type { StateCreator } from "zustand"
import { getStoredTheme, removeStoredTheme, setStoredTheme } from "@/utils/storage"
import { TThemeMode } from "@/utils/types"

export interface ThemeSlice {
	theme: {
		mode: TThemeMode
		setMode: (mode: TThemeMode) => void
		initializeTheme: () => void
	}
}

export const createThemeSlice: StateCreator<ThemeSlice> = (set) => ({
	theme: {
		mode: "light",
		setMode: (mode) => {
			if (mode === "system") {
				removeStoredTheme()
			} else {
				setStoredTheme(mode)
			}
			set((state) => ({
				theme: { ...state.theme, mode },
			}))
		},
		initializeTheme: () => {
			const storedTheme = getStoredTheme()
			const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches
			const mode: TThemeMode | "system" = storedTheme || (prefersDarkMode ? "dark" : "light")
			set((state) => ({
				theme: { ...state.theme, mode: storedTheme ? storedTheme : "system" },
			}))
			document.documentElement.style.setProperty(
				"color-scheme",
				mode === "system" ? (prefersDarkMode ? "dark" : "light") : mode,
			)
		},
	},
})
