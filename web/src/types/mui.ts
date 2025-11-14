/**
 * Material-UI Type Definitions
 *
 * Centralized type definitions for MUI components to eliminate `any` types
 */

import type { SxProps, Theme } from '@mui/material/styles'

/**
 * Type-safe SxProps for Material-UI components
 * Use this instead of `any` for sx prop types
 */
export type MuiSxProps = SxProps<Theme>
