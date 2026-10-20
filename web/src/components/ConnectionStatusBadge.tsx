/**
 * ConnectionStatusBadge Component
 *
 * Displays a small colored indicator showing WebSocket connection status.
 * Shows in the top-right corner of the board with a tooltip.
 */

import { memo } from "react"
import { Box, Tooltip } from "@mui/material"

interface ConnectionStatusBadgeProps {
  status: string
}

function ConnectionStatusBadgeComponent({ status }: ConnectionStatusBadgeProps) {
  // Determine color and tooltip based on status
  const getStatusInfo = () => {
    switch (status) {
      case "Open":
        return {
          color: "#4caf50", // Green
          label: "Connected",
          pulse: false,
        }
      case "Reconnecting":
      case "Connecting":
        return {
          color: "#ff9800", // Orange
          label: "Reconnecting...",
          pulse: true,
        }
      case "Closed":
      case "Closing":
        return {
          color: "#f44336", // Red
          label: "Disconnected",
          pulse: false,
        }
      case "Uninstantiated":
        return {
          color: "#9e9e9e", // Grey
          label: "Not connected",
          pulse: false,
        }
      default:
        return {
          color: "#9e9e9e", // Grey
          label: `Status: ${status}`,
          pulse: false,
        }
    }
  }

  const { color, label, pulse } = getStatusInfo()

  return (
    <Tooltip title={label} placement="left">
      <Box
        sx={{
          position: "fixed",
          top: 16,
          right: 16,
          width: 12,
          height: 12,
          borderRadius: "50%",
          backgroundColor: color,
          boxShadow: `0 0 0 2px ${color}33`, // 33 = 20% opacity for outer ring
          cursor: "pointer",
          zIndex: 1000,
          animation: pulse ? "pulse 2s ease-in-out infinite" : "none",
          "@keyframes pulse": {
            "0%, 100%": {
              opacity: 1,
              transform: "scale(1)",
            },
            "50%": {
              opacity: 0.6,
              transform: "scale(1.1)",
            },
          },
          transition: "all 0.3s ease",
          "&:hover": {
            transform: "scale(1.2)",
          },
        }}
      />
    </Tooltip>
  )
}

export const ConnectionStatusBadge = memo(ConnectionStatusBadgeComponent)
