import { TThemeMode } from "@/utils/types"
import { isThemeMode, createPrefixedKey } from "./helpers"
import { IColumn } from "./interfaces"

const THEME_KEY = createPrefixedKey("theme")
const USER_EMAIL_KEY = createPrefixedKey("user-email")
const HEADER_CONFIG_KEY = createPrefixedKey("header-config")
const ORDER_KEY = createPrefixedKey("column-order")
const DEV_IDS_KEY = createPrefixedKey("dev-ids")
const DEV_PREDECESSOORS_KEY = createPrefixedKey("dev-predecessors")

export const getStoredTheme = (): TThemeMode | null => {
  const storedTheme = window.localStorage.getItem(THEME_KEY)

  return isThemeMode(storedTheme) ? storedTheme : null
}

export const setStoredTheme = (mode: TThemeMode): void => {
  window.localStorage.setItem(THEME_KEY, mode)
  document.documentElement.style.setProperty("color-scheme", mode)
}

export const removeStoredTheme = (): void => {
  window.localStorage.removeItem(THEME_KEY)
  const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches
  const systemMode = prefersDarkMode ? "dark" : "light"
  document.documentElement.style.setProperty("color-scheme", systemMode)
}

export const getStoredUserEmail = (): string | null => {
  return window.localStorage.getItem(USER_EMAIL_KEY)
}

export const setStoredUserEmail = (email: string): void => {
  window.localStorage.setItem(USER_EMAIL_KEY, email)
}

export const removeStoredUserEmail = (): void => {
  window.localStorage.removeItem(USER_EMAIL_KEY)
}

export const getStoredHeaderOption = (): string => {
  const savedOption = localStorage.getItem(HEADER_CONFIG_KEY)
  return savedOption ? savedOption : "updated_only"
}

export const setStoredHeaderOption = (option: string): void => {
  localStorage.setItem(HEADER_CONFIG_KEY, option)
}

export const getStoredColumnOrder = (): IColumn[] | null => {
  const savedOrder = window.localStorage.getItem(ORDER_KEY)
  return savedOrder ? JSON.parse(savedOrder) : null
}

export const setStoredColumnOrder = (order: IColumn[]): void => {
  window.localStorage.setItem(ORDER_KEY, JSON.stringify(order))
}

export const getStoredDevIdsValue = (): boolean => {
  const value = window.localStorage.getItem(DEV_IDS_KEY)
  return value === "true"
}

export const setStoredDevIdsValue = (order: boolean): void => {
  window.localStorage.setItem(DEV_IDS_KEY, order.toString())
}

export const getStoredDevPredecessorsValue = (): boolean => {
  const value = window.localStorage.getItem(DEV_PREDECESSOORS_KEY)
  return value === "true"
}

export const setStoredDevPredecessorsValue = (order: boolean): void => {
  window.localStorage.setItem(DEV_PREDECESSOORS_KEY, order.toString())
}
