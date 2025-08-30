import { ChangeEvent, DragEvent, useState } from "react"
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown"
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp"
import {
  Box,
  Card,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  Radio,
  RadioGroup,
  Checkbox,
  Typography,
} from "@mui/material"
import { IColumn } from "@/utils/interfaces"
import {
  getStoredColumnOrder,
  setStoredColumnOrder,
  getStoredHeaderOption,
  setStoredHeaderOption,
  getStoredDevIdsValue,
  setStoredDevIdsValue,
  getStoredDevPredecessorsValue,
  setStoredDevPredecessorsValue,
} from "@/utils/storage"

const INITIAL_COLUMNS: IColumn[] = [
  { title: "NOTES", orderKey: 0 },
  { title: "TODO", orderKey: 1 },
  { title: "IN PROGRESS", orderKey: 2 },
  { title: "DONE", orderKey: 3 },
]

export function BoardConfiguration() {
  const columns = getStoredColumnOrder() || INITIAL_COLUMNS
  const [headerOption, setHeaderOption] = useState<string>(getStoredHeaderOption())
  const [devIdsCheck, setDevIdsCheck] = useState<boolean>(getStoredDevIdsValue())
  const [devPredecessorsCheck, setDevPredecessorsCheck] = useState<boolean>(getStoredDevPredecessorsValue())
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const handleDragStart = (event: DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index)
    event.currentTarget.style.cursor = "grabbing"
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>, index: number) => {
    event.preventDefault()
    setDragOverIndex(index)
    event.currentTarget.style.cursor = "grab"
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (index: number) => {
    if (draggedIndex === null) return

    const updatedColumns = [...columns]
    const [draggedColumn] = updatedColumns.splice(draggedIndex, 1)
    updatedColumns.splice(index, 0, draggedColumn)

    const reorderedColumns = updatedColumns.map((column, idx) => ({
      ...column,
      orderKey: idx,
    }))

    setStoredColumnOrder(reorderedColumns)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const moveColumnUp = (index: number) => {
    if (index === 0) return

    const updatedColumns = [...columns]
    const temp = updatedColumns[index - 1]
    updatedColumns[index - 1] = updatedColumns[index]
    updatedColumns[index] = temp

    const reorderedColumns = updatedColumns.map((column, idx) => ({
      ...column,
      orderKey: idx,
    }))

    setStoredColumnOrder(reorderedColumns)
  }

  const moveColumnDown = (index: number) => {
    if (index === columns.length - 1) return

    const updatedColumns = [...columns]
    const temp = updatedColumns[index + 1]
    updatedColumns[index + 1] = updatedColumns[index]
    updatedColumns[index] = temp

    const reorderedColumns = updatedColumns.map((column, idx) => ({
      ...column,
      orderKey: idx,
    }))

    setStoredColumnOrder(reorderedColumns)
  }

  const handleHeaderOptionChange = (event: ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value
    setHeaderOption(newValue)
    setStoredHeaderOption(newValue)
  }

  const handleDevIdsChange = (event: ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked
    setDevIdsCheck(newValue)
    setStoredDevIdsValue(newValue)
  }

  const handleDevPredecessorsChange = (event: ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked
    setDevPredecessorsCheck(newValue)
    setStoredDevPredecessorsValue(newValue)
  }

  return (
    <>
      <Typography variant="h2">Column Order Configuration</Typography>
      <Grid container spacing={2} mt={1}>
        {columns
          .sort((a, b) => a.orderKey - b.orderKey)
          .map((column, index) => (
            <Grid item xs={12} key={column.title}>
              <Card
                draggable
                onDragStart={(event) => handleDragStart(event, index)}
                onDragOver={(event) => handleDragOver(event, index)}
                onDragLeave={handleDragLeave}
                onDrop={() => handleDrop(index)}
                elevation={4}
                sx={{
                  m: 0,
                  transition: "opacity 0.25s ease-out",
                  py: { xs: 1, lg: 2 },
                  px: 4,
                  border: dragOverIndex === index ? "2px dashed #1976d2" : "2px solid transparent",
                  cursor: "grab",
                }}
              >
                <Grid container alignItems="center">
                  <Grid item xs={10}>
                    <Typography variant="body1">{column.title}</Typography>
                  </Grid>
                  <Grid item xs={2} display={{ lg: "none" }}>
                    <Box display="flex" flexDirection="column" alignItems="end">
                      <IconButton
                        color="secondary"
                        aria-label="order-up"
                        disabled={column.orderKey === 0}
                        onClick={() => moveColumnUp(index)}
                        disableRipple={true}
                      >
                        <KeyboardArrowUpIcon />
                      </IconButton>
                      <IconButton
                        color="secondary"
                        aria-label="order-down"
                        disabled={column.orderKey === columns.length - 1}
                        onClick={() => moveColumnDown(index)}
                        disableRipple={true}
                      >
                        <KeyboardArrowDownIcon />
                      </IconButton>
                    </Box>
                  </Grid>
                </Grid>
              </Card>
            </Grid>
          ))}
      </Grid>

      <Typography variant="h2" mt={6} mb={2}>
        Card Header Configuration
      </Typography>
      <FormControl component="fieldset">
        <RadioGroup
          aria-label="card-header-options"
          name="card-header-options"
          value={headerOption}
          onChange={handleHeaderOptionChange}
        >
          <FormControlLabel value="no_time" control={<Radio />} label="Show No time" />
          <FormControlLabel value="updated_only" control={<Radio />} label="Show Updated only" />
          <FormControlLabel value="created_updated" control={<Radio />} label="Show Created and Updated" />
        </RadioGroup>
      </FormControl>

      <Typography variant="h2" mt={6} mb={2}>
        Developer options
      </Typography>
      <FormControl component="fieldset">
        <FormControlLabel
          control={<Checkbox checked={devIdsCheck} onChange={handleDevIdsChange} />}
          label="Show note ID"
        />
        <FormControlLabel
          control={<Checkbox checked={devPredecessorsCheck} onChange={handleDevPredecessorsChange} />}
          label="Show note predecessor ID"
        />
      </FormControl>
    </>
  )
}
