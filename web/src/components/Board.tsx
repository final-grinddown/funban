import { DragEvent, useMemo, useRef, useState } from "react"
import { Box, Divider, Stack } from "@mui/material"
import { createUpdateNoteReorderBefore, createUpdateNoteReorderLast } from "@/app/api/websocket"
import { useWebSocketContext } from "@/context/WebSocketProvider"
import { IColumnData, Note } from "@/utils/interfaces"
import { getStoredColumnOrder } from "@/utils/storage"
import { BackdropLoading } from "./BackdropLoading"
import { BoardColumn } from "./BoardColumn"

interface Props {
  notes: Note[]
  isEditable: boolean
  selectedUserId?: number
  isFocus: boolean
  currentUser: string
}

export function Board({
  notes,
  isEditable,
  selectedUserId,
  isFocus,
  currentUser,
}: Props) {
  const { sendMessageAsync, isLoading } = useWebSocketContext()
  const draggingItemIdRef = useRef<string | null>(null)
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null)
  const columnOrder = getStoredColumnOrder()

  const columns = useMemo(() => {
    const sortNotes = (notes: Note[]) => {
      const idToNote = new Map<number, Note>()
      const sorted: Note[] = []
      const visited = new Set<number>()

      notes.forEach((note) => idToNote.set(note.id, note))

      // Find roots (notes with no predecessor)
      const roots = notes.filter((note) => note.predecessor_id === null)

      // Traverse linked list
      roots.forEach((root) => {
        let current: Note | undefined = root
        while (current && !visited.has(current.id)) {
          sorted.push(current)
          visited.add(current.id)
          current = idToNote.get(notes.find((note) => note.predecessor_id === current!.id)?.id ?? NaN)
        }
      })

      // Add any orphaned notes (not in a valid chain)
      const orphaned = notes.filter((note) => !visited.has(note.id))
      return [...sorted, ...orphaned]
    }

    const columnData: IColumnData[] = [
      {
        title: "NOTES",
        state: "notes",
        items: sortNotes(notes.filter((note) => note.state === "notes")),
        orderKey: 0,
      },
      {
        title: "TODO",
        state: "todo",
        items: sortNotes(notes.filter((note) => note.state === "todo")),
        orderKey: 1,
      },
      {
        title: "IN PROGRESS",
        state: "in_progress",
        items: sortNotes(notes.filter((note) => note.state === "in_progress")),
        orderKey: 2,
      },
      {
        title: "DONE",
        state: "done",
        items: sortNotes(notes.filter((note) => note.state === "done")),
        orderKey: 3,
      },
    ]

    return columnData
      .map((col) => {
        const orderKey = columnOrder?.find((o) => o.title === col.title)?.orderKey ?? col.orderKey
        return { ...col, orderKey }
      })
      .sort((a, b) => a.orderKey - b.orderKey)
  }, [notes, columnOrder])

  const handleDragStart = (event: DragEvent<HTMLDivElement>, itemId: string) => {
    draggingItemIdRef.current = itemId
    event.stopPropagation()
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>, columnId: string, over_id: number | null) => {
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
  }

  const handleDragEnd = () => {
    draggingItemIdRef.current = null
    setHoveredColumn(null)
  }

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
            hoveredColumn={hoveredColumn}
            setHoveredColumn={setHoveredColumn}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            selectedUserId={selectedUserId}
            columnIndex={orderKey}
            isFocus={isFocus}
            currentUser={currentUser}
          />
        ))}
      </Stack>
      {isLoading && <BackdropLoading isInDashboard={true} />}
    </Box>
  )
}
