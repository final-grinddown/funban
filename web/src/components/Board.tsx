import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core"
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { Box, Divider, Stack } from "@mui/material"
import { useHotkeys } from "react-hotkeys-hook"
import { createUpdateNoteReorderBefore, createUpdateNoteReorderLast } from "@/app/api/websocket"
import { useWebSocketContext } from "@/context/WebSocketProvider"
import { useNoteSorting } from "@/hooks/useNoteSorting"
import { useAppStore, selectNotes } from "@/store"
import { IColumnData } from "@/utils/interfaces"
import { getStoredColumnOrder } from "@/utils/storage"
import { BoardColumn } from "./BoardColumn"
import { BoardItemCard } from "./BoardItemCard"
import { BoardLoadingState } from "./BoardLoadingState"
import { DeleteNoteModal } from "./DeleteNoteModal"
import { EditNoteModal } from "./EditNoteModal"
import { SplitNoteModal } from "./SplitNoteModal"

interface Props {
  isEditable: boolean
}

export function Board({ isEditable }: Props) {
  const { sendMessageAsync, isLoading } = useWebSocketContext()
  const notes = useAppStore(selectNotes)
  const asyncQueue = useAppStore((state) => state.actions.asyncQueue)
  const isAnyModalOpen = useAppStore((state) => state.modals.isAnyModalOpen)
  const closeModal = useAppStore((state) => state.modals.closeModal)
  const deleteNoteModalOpen = useAppStore((state) => state.modals.deleteNote.isOpen)
  const editNoteModalOpen = useAppStore((state) => state.modals.editNote.isOpen)
  const splitNoteModalOpen = useAppStore((state) => state.modals.splitNote.isOpen)
  const [activeId, setActiveId] = useState<number | null>(null) // Currently dragging
  const pendingDragUuidRef = useRef<string | null>(null) // UUID of pending drag operation
  const columnOrder = getStoredColumnOrder()

  // Refs to access first note in each column for keyboard navigation
  const notesColumnRef = useRef<HTMLDivElement | null>(null)
  const todoColumnRef = useRef<HTMLDivElement | null>(null)
  const inProgressColumnRef = useRef<HTMLDivElement | null>(null)
  const doneColumnRef = useRef<HTMLDivElement | null>(null)

  // Filter and sort notes by state - these are the source of truth from the store
  const storeNotesNotes = useNoteSorting(notes.filter((note) => note.state === "notes"))
  const storeTodoNotes = useNoteSorting(notes.filter((note) => note.state === "todo"))
  const storeInProgressNotes = useNoteSorting(notes.filter((note) => note.state === "in_progress"))
  const storeDoneNotes = useNoteSorting(notes.filter((note) => note.state === "done"))

  // Local state for optimistic updates during drag (makes animations work between columns)
  const [localNotesNotes, setLocalNotesNotes] = useState(storeNotesNotes)
  const [localTodoNotes, setLocalTodoNotes] = useState(storeTodoNotes)
  const [localInProgressNotes, setLocalInProgressNotes] = useState(storeInProgressNotes)
  const [localDoneNotes, setLocalDoneNotes] = useState(storeDoneNotes)

  // Use local state during drag or while waiting for server confirmation
  // Check if our pending drag UUID is still in the asyncQueue (not yet confirmed)
  const hasPendingDrag = pendingDragUuidRef.current !== null &&
    asyncQueue.some(action => action.id === pendingDragUuidRef.current)

  const isOptimistic = activeId !== null || hasPendingDrag
  const notesNotes = isOptimistic ? localNotesNotes : storeNotesNotes
  const todoNotes = isOptimistic ? localTodoNotes : storeTodoNotes
  const inProgressNotes = isOptimistic ? localInProgressNotes : storeInProgressNotes
  const doneNotes = isOptimistic ? localDoneNotes : storeDoneNotes

  // Clear pending drag UUID when server confirms (removed from asyncQueue)
  useEffect(() => {
    if (pendingDragUuidRef.current !== null && !hasPendingDrag) {
      // UUID is no longer in queue - server has confirmed
      pendingDragUuidRef.current = null
    }
  }, [hasPendingDrag])

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

  const activeNote = useMemo(() => {
    return activeId ? notes.find((note) => note.id === activeId) : null
  }, [activeId, notes])

  // Configure @dnd-kit sensors for mouse, touch, and keyboard
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts (prevents accidental drags)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // Helper to focus first note in a column
  const focusFirstNoteInColumn = useCallback((columnRef: React.RefObject<HTMLDivElement | null>) => {
    if (!columnRef.current) return
    // @dnd-kit adds tabIndex and role="button" to sortable items via attributes spread
    // Find first Card element with these attributes (skip the header button)
    const firstCard = columnRef.current.querySelector('.MuiCard-root[tabindex="0"]') as HTMLElement
    if (firstCard) {
      firstCard.focus()
    }
  }, [])

  // Keyboard shortcuts to focus first note in each column (1-4)
  useHotkeys('1', (e) => {
    if (isAnyModalOpen()) return
    e.preventDefault()
    focusFirstNoteInColumn(notesColumnRef)
  }, [focusFirstNoteInColumn])

  useHotkeys('2', (e) => {
    if (isAnyModalOpen()) return
    e.preventDefault()
    focusFirstNoteInColumn(todoColumnRef)
  }, [focusFirstNoteInColumn])

  useHotkeys('3', (e) => {
    if (isAnyModalOpen()) return
    e.preventDefault()
    focusFirstNoteInColumn(inProgressColumnRef)
  }, [focusFirstNoteInColumn])

  useHotkeys('4', (e) => {
    if (isAnyModalOpen()) return
    e.preventDefault()
    focusFirstNoteInColumn(doneColumnRef)
  }, [focusFirstNoteInColumn])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as number)
    // Initialize local state from store for optimistic updates
    setLocalNotesNotes(storeNotesNotes)
    setLocalTodoNotes(storeTodoNotes)
    setLocalInProgressNotes(storeInProgressNotes)
    setLocalDoneNotes(storeDoneNotes)
  }, [storeNotesNotes, storeTodoNotes, storeInProgressNotes, storeDoneNotes])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event

    if (!over) return

    const activeId = active.id as number
    const overId = over.id

    // Find which containers the active and over items are in
    const activeContainer =
      localNotesNotes.find(n => n.id === activeId) ? 'notes' :
      localTodoNotes.find(n => n.id === activeId) ? 'todo' :
      localInProgressNotes.find(n => n.id === activeId) ? 'in_progress' :
      localDoneNotes.find(n => n.id === activeId) ? 'done' : null

    const overContainer =
      localNotesNotes.find(n => n.id === overId) ? 'notes' :
      localTodoNotes.find(n => n.id === overId) ? 'todo' :
      localInProgressNotes.find(n => n.id === overId) ? 'in_progress' :
      localDoneNotes.find(n => n.id === overId) ? 'done' :
      overId === 'NOTES' ? 'notes' :
      overId === 'TODO' ? 'todo' :
      overId === 'IN PROGRESS' ? 'in_progress' :
      overId === 'DONE' ? 'done' : null

    if (!activeContainer || !overContainer) return

    // If moving between containers, update local state for smooth animation
    if (activeContainer !== overContainer) {
      const activeNote = notes.find(n => n.id === activeId)
      if (!activeNote) return

      // Remove from source container and add to target
      const updateContainers = () => {
        const removeFrom = (items: typeof localNotesNotes) => items.filter(n => n.id !== activeId)
        const addTo = (items: typeof localNotesNotes, targetId?: number) => {
          const filtered = items.filter(n => n.id !== activeId)
          if (typeof targetId === 'number') {
            const targetIndex = filtered.findIndex(n => n.id === targetId)
            if (targetIndex >= 0) {
              // Insert BEFORE the target index (not after)
              return [...filtered.slice(0, targetIndex), activeNote, ...filtered.slice(targetIndex)]
            }
          }
          return [...filtered, activeNote]
        }

        switch (activeContainer) {
          case 'notes': setLocalNotesNotes(prev => removeFrom(prev)); break
          case 'todo': setLocalTodoNotes(prev => removeFrom(prev)); break
          case 'in_progress': setLocalInProgressNotes(prev => removeFrom(prev)); break
          case 'done': setLocalDoneNotes(prev => removeFrom(prev)); break
        }

        const targetNoteId = typeof overId === 'number' ? overId : undefined
        switch (overContainer) {
          case 'notes': setLocalNotesNotes(prev => addTo(prev, targetNoteId)); break
          case 'todo': setLocalTodoNotes(prev => addTo(prev, targetNoteId)); break
          case 'in_progress': setLocalInProgressNotes(prev => addTo(prev, targetNoteId)); break
          case 'done': setLocalDoneNotes(prev => addTo(prev, targetNoteId)); break
        }
      }

      updateContainers()
    } else {
      // Within same container - update order for smooth animation
      if (typeof overId === 'number' && activeId !== overId) {
        const updateContainer = (items: typeof localNotesNotes) => {
          const oldIndex = items.findIndex(n => n.id === activeId)
          const newIndex = items.findIndex(n => n.id === overId)

          if (oldIndex !== -1 && newIndex !== -1) {
            return arrayMove(items, oldIndex, newIndex)
          }
          return items
        }

        switch (activeContainer) {
          case 'notes': setLocalNotesNotes(updateContainer); break
          case 'todo': setLocalTodoNotes(updateContainer); break
          case 'in_progress': setLocalInProgressNotes(updateContainer); break
          case 'done': setLocalDoneNotes(updateContainer); break
        }
      }
    }
  }, [localNotesNotes, localTodoNotes, localInProgressNotes, localDoneNotes, notes])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      // Clear dragging state immediately (so DragOverlay disappears)
      setActiveId(null)

      if (!over) {
        return
      }

      const draggedNote = notes.find((note) => note.id === active.id)
      if (!draggedNote) {
        return
      }

      const activeNoteId = active.id as number

      // Find which column the note ended up in
      const targetColumn =
        localNotesNotes.find(n => n.id === activeNoteId) ? { items: localNotesNotes, state: 'notes' } :
        localTodoNotes.find(n => n.id === activeNoteId) ? { items: localTodoNotes, state: 'todo' } :
        localInProgressNotes.find(n => n.id === activeNoteId) ? { items: localInProgressNotes, state: 'in_progress' } :
        localDoneNotes.find(n => n.id === activeNoteId) ? { items: localDoneNotes, state: 'done' } :
        null

      if (!targetColumn) return

      // Get the column items (they've been updated by onDragOver)
      const columnItems = targetColumn.items

      // Find the index of the dragged note in the final array
      const newIndex = columnItems.findIndex(n => n.id === activeNoteId)

      if (newIndex === -1) return

      // Send message and track UUID - keep showing optimistic state until server confirms
      if (newIndex === columnItems.length - 1) {
        // Last position - use reorderLast
        const message = createUpdateNoteReorderLast(draggedNote.id.toString(), targetColumn.state)
        const uuid = sendMessageAsync(message, "(Id: " + draggedNote.id + ") Note successfully moved!")
        pendingDragUuidRef.current = uuid
      } else if (newIndex === 0) {
        // First position - insert before current first item (which is now at index 1 after arrayMove)
        const currentFirstNote = columnItems[1]
        if (currentFirstNote) {
          const message = createUpdateNoteReorderBefore(draggedNote.id.toString(), currentFirstNote.id)
          const uuid = sendMessageAsync(message, "(Id: " + draggedNote.id + ") Note successfully moved!")
          pendingDragUuidRef.current = uuid
        }
      } else {
        // Middle position - insert before the next note
        const nextNote = columnItems[newIndex + 1]
        if (nextNote) {
          const message = createUpdateNoteReorderBefore(draggedNote.id.toString(), nextNote.id)
          const uuid = sendMessageAsync(message, "(Id: " + draggedNote.id + ") Note successfully moved!")
          pendingDragUuidRef.current = uuid
        }
      }
    },
    [notes, localNotesNotes, localTodoNotes, localInProgressNotes, localDoneNotes, sendMessageAsync],
  )

  return (
    <Box py={4}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <Stack
          direction="row"
          divider={<Divider orientation="vertical" flexItem />}
          spacing={2}
          minHeight="calc(100vh - 250px)"
          sx={{ overflowX: "auto" }}
        >
          {columns.map(({ title, items, state, orderKey }) => {
            // Assign correct ref based on column state
            const columnRef =
              state === 'notes' ? notesColumnRef :
              state === 'todo' ? todoColumnRef :
              state === 'in_progress' ? inProgressColumnRef :
              state === 'done' ? doneColumnRef :
              undefined

            return (
              <BoardColumn
                key={state}
                ref={columnRef}
                title={title}
                items={items}
                state={state}
                isEditable={isEditable}
                columnIndex={orderKey}
              />
            )
          })}
        </Stack>

        <DragOverlay>
          {activeNote ? (
            <Box sx={{ opacity: 0.8, cursor: "grabbing" }}>
              <BoardItemCard {...activeNote} isEditable={false} predecessor_id={activeNote.predecessor_id} />
            </Box>
          ) : null}
        </DragOverlay>
      </DndContext>

      <BoardLoadingState isLoading={isLoading} />

      <DeleteNoteModal isOpen={deleteNoteModalOpen} onClose={() => closeModal("deleteNote")} />
      <EditNoteModal isOpen={editNoteModalOpen} onClose={() => closeModal("editNote")} />
      <SplitNoteModal isOpen={splitNoteModalOpen} onClose={() => closeModal("splitNote")} />
    </Box>
  )
}
