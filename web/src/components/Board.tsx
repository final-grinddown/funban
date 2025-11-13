import { DragEvent, useCallback, useMemo, useRef } from "react"
import { Box, Divider, Stack } from "@mui/material"
import { createUpdateNoteReorderBefore, createUpdateNoteReorderLast } from "@/app/api/websocket"
import { useWebSocketContext } from "@/context/WebSocketProvider"
import { useNoteSorting } from "@/hooks/useNoteSorting"
import { useAppStore, selectNotes } from "@/store"
import { IColumnData } from "@/utils/interfaces"
import { getStoredColumnOrder } from "@/utils/storage"
import { BoardColumn } from "./BoardColumn"
import { BoardLoadingState } from "./BoardLoadingState"

interface Props {
  isEditable: boolean
}

export function Board({ isEditable }: Props) {
  const { sendMessageAsync, isLoading } = useWebSocketContext()
  const notes = useAppStore(selectNotes)
  const setHoveredColumn = useAppStore((state) => state.ui.setHoveredColumn)
  const draggingItemIdRef = useRef<string | null>(null)
  const columnOrder = getStoredColumnOrder()

  // Filter and sort notes by state
  const notesNotes = useNoteSorting(notes.filter((note) => note.state === "notes"))
  const todoNotes = useNoteSorting(notes.filter((note) => note.state === "todo"))
  const inProgressNotes = useNoteSorting(notes.filter((note) => note.state === "in_progress"))
  const doneNotes = useNoteSorting(notes.filter((note) => note.state === "done"))

  const columns = useMemo(() => {
    const columnData: IColumnData[] = [
      {
        title: "NOTES",
        state: "notes",
        items: notesNotes,
        orderKey: 0,
      },
      {
        title: "TODO",
        state: "todo",
        items: todoNotes,
        orderKey: 1,
      },
      {
        title: "IN PROGRESS",
        state: "in_progress",
        items: inProgressNotes,
        orderKey: 2,
      },
      {
        title: "DONE",
        state: "done",
        items: doneNotes,
        orderKey: 3,
      },
    ]

    return columnData
      .map((col) => {
        const orderKey = columnOrder?.find((o) => o.title === col.title)?.orderKey ?? col.orderKey
        return { ...col, orderKey }
      })
      .sort((a, b) => a.orderKey - b.orderKey)
  }, [notesNotes, todoNotes, inProgressNotes, doneNotes, columnOrder])

  const handleDragStart = useCallback((event: DragEvent<HTMLDivElement>, itemId: string) => {
    draggingItemIdRef.current = itemId
    event.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>, columnId: string, over_id: number | null) => {
      event.preventDefault()

      if (!draggingItemIdRef.current) return

      const draggedNote = notes.find((note) => String(note.id) === draggingItemIdRef.current)

      if (!draggedNote) return

      const newState = columnId.toLowerCase().replace(" ", "_")

      const message =
        over_id != null && over_id != undefined
          ? createUpdateNoteReorderBefore(draggedNote.id.toString(), over_id)
          : createUpdateNoteReorderLast(draggedNote.id.toString(), newState)

      sendMessageAsync(message, "(Id: " + draggedNote.id + ") Note successfully moved!")

      draggingItemIdRef.current = null
      setHoveredColumn(null)
    },
    [notes, sendMessageAsync, setHoveredColumn],
  )

  const handleDragEnd = useCallback(() => {
    draggingItemIdRef.current = null
    setHoveredColumn(null)
  }, [setHoveredColumn])

  return (
    <Box py={4}>
      <Stack
        direction="row"
        divider={<Divider orientation="vertical" flexItem />}
        spacing={2}
        minHeight="calc(100vh - 250px)"
        sx={{ overflowX: "auto" }}
      >
        {columns.map(({ title, items, state, orderKey }) => (
          <BoardColumn
            key={state}
            title={title}
            items={items}
            state={state}
            isEditable={isEditable}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            columnIndex={orderKey}
          />
        ))}
      </Stack>
      <BoardLoadingState isLoading={isLoading} />
    </Box>
  )
}
