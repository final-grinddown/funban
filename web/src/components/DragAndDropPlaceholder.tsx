import { DragEvent } from "react"
import ControlPointIcon from "@mui/icons-material/ControlPoint"
import { Box } from "@mui/material"

interface DragAndDropPlaceholderProps {
  onDragOver?: (event: DragEvent<HTMLDivElement>) => void
  onDrop?: (event: DragEvent<HTMLDivElement>) => void
}

export const DragAndDropPlaceholder = ({ onDragOver, onDrop }: DragAndDropPlaceholderProps) => {
  return (
    <Box
      height={60}
      bgcolor="rgba(0, 0, 0, 0.1)"
      border="2px dashed #1976d2"
      borderRadius={2}
      p={2}
      boxShadow="0 2px 4px rgba(0, 0, 0, 0.1)"
      display="flex"
      justifyContent="center"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <ControlPointIcon fontSize="medium" color="primary" />
    </Box>
  )
}
