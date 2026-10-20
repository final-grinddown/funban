"use client"
import { createTheme } from "@mui/material/styles"
import { Roboto } from "next/font/google"

// Define Roboto font
const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
})

const lightPalette = {
  primary: {
    main: "#3b82f6",
  },
  secondary: {
    main: "#ff9800",
  },
  background: {
    default: "#f7f7f7",
    paper: "#e0e0e0",
  },
  text: {
    primary: "#212121",
    secondary: "#5f6368",
  },
}

const darkPalette = {
  primary: {
    main: "#3b82f6",
  },
  secondary: {
    main: "#ff9800",
  },
  background: {
    default: "#1e1e1e",
    paper: "#2e2e2e",
  },
  text: {
    primary: "#e0e0e0",
    secondary: "#b0b0b0",
  },
}

// Create the base theme
const baseTheme = createTheme({
  typography: {
    fontFamily: roboto.style.fontFamily,
  },
})

export const theme = createTheme({
  ...baseTheme,
  typography: {
    h1: {
      fontSize: "1.75rem",
      fontWeight: 700,
      [baseTheme.breakpoints.up("sm")]: {
        fontSize: "2rem",
      },
      [baseTheme.breakpoints.up("lg")]: {
        fontSize: "2.5rem",
      },
    },
    h2: {
      fontSize: "1.5rem",
      fontWeight: 700,
    },
    h6: {
      fontSize: "1.25rem",
      fontWeight: 700,
    },
    button: {
      fontWeight: 700,
    },
  },
})

export const lightTheme = createTheme({
  ...theme,
  palette: { ...lightPalette, mode: "light" },
})

export const darkTheme = createTheme({
  ...theme,
  palette: { ...darkPalette, mode: "dark" },
})
