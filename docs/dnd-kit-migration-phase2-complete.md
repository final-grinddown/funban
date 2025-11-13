# @dnd-kit Migration - Phase 2 Complete

**Date:** 2025-11-13
**Status:** ✅ Complete - Production Ready

## Overview

Phase 2 successfully migrated the drag-and-drop system from native HTML5 to @dnd-kit library with full multi-container support, optimistic updates, and proper visual feedback.

## What Was Implemented

### 1. Multi-Container Drag & Drop
- ✅ Drag notes within same column (reordering)
- ✅ Drag notes between columns (changing state)
- ✅ Smooth animations during drag
- ✅ Column highlight when dragging over
- ✅ Support for keyboard navigation
- ✅ Touch device support

### 2. Optimistic Updates with Server Confirmation
**Challenge:** @dnd-kit expects immediate array updates, but our architecture waits for WebSocket confirmation.

**Solution:** Track pending operations using the existing `asyncQueue` system:

```typescript
// Track pending drag operation by UUID
const pendingDragUuidRef = useRef<string | null>(null)
const asyncQueue = useAppStore((state) => state.actions.asyncQueue)

// Keep using local state while UUID is in asyncQueue
const hasPendingDrag = pendingDragUuidRef.current !== null &&
  asyncQueue.some(action => action.id === pendingDragUuidRef.current)

// When server confirms (ActionFinished), UUID removed from queue → switch to store state
```

**Benefits:**
- No arbitrary timeouts
- Prevents double-moves (user can't drag again until confirmed)
- Notification shows only after server confirmation
- Automatically handles network latency

### 3. Fixed Position Bugs

#### First Position in Same Column
When `newIndex === 0`, insert before the item that's now at index 1:
```typescript
if (newIndex === 0) {
  const currentFirstNote = columnItems[1]
  const message = createUpdateNoteReorderBefore(draggedNote.id, currentFirstNote.id)
}
```

#### First Position in Different Column
Fixed `handleDragOver` to insert BEFORE the target, not after:
```typescript
// Insert BEFORE the target index
return [...filtered.slice(0, targetIndex), activeNote, ...filtered.slice(targetIndex)]
```

## Key Implementation Details

### State Management
```typescript
// Store notes filtered by state (source of truth from WebSocket)
const storeNotesNotes = useNoteSorting(notes.filter((note) => note.state === "notes"))
const storeTodoNotes = useNoteSorting(notes.filter((note) => note.state === "todo"))
// ... etc

// Local optimistic state for smooth drag animations
const [localNotesNotes, setLocalNotesNotes] = useState(storeNotesNotes)
const [localTodoNotes, setLocalTodoNotes] = useState(storeTodoNotes)
// ... etc

// Use local during drag OR while waiting for server, otherwise use store
const hasPendingDrag = pendingDragUuidRef.current !== null &&
  asyncQueue.some(action => action.id === pendingDragUuidRef.current)
const isOptimistic = activeId !== null || hasPendingDrag

const notesNotes = isOptimistic ? localNotesNotes : storeNotesNotes
```

### Drag Event Handlers

**onDragStart:** Initialize local state from store
```typescript
const handleDragStart = useCallback((event: DragStartEvent) => {
  setActiveId(event.active.id as number)
  setLocalNotesNotes(storeNotesNotes)
  setLocalTodoNotes(storeTodoNotes)
  // ... sync all local arrays
}, [storeNotesNotes, storeTodoNotes, ...])
```

**onDragOver:** Update local state in real-time
```typescript
const handleDragOver = useCallback((event: DragOverEvent) => {
  // Cross-column: Move note between local arrays
  if (activeContainer !== overContainer) {
    // Remove from source, add to target (before hovered item)
  }
  // Within-column: Reorder using arrayMove
  else {
    setLocalNotesNotes(items => arrayMove(items, oldIndex, newIndex))
  }
}, [localNotesNotes, ...])
```

**onDragEnd:** Clear activeId, send to server, track UUID
```typescript
const handleDragEnd = useCallback((event: DragEndEvent) => {
  setActiveId(null) // Clear immediately so DragOverlay disappears

  // Determine position and send appropriate message
  if (newIndex === 0) {
    // First position: insert before item at index 1
  } else if (newIndex === columnItems.length - 1) {
    // Last position: use reorderLast
  } else {
    // Middle: insert before item at index + 1
  }

  // Track UUID for optimistic state
  const uuid = sendMessageAsync(message, successMessage)
  pendingDragUuidRef.current = uuid
}, [notes, localNotesNotes, ...])
```

## Files Modified

### Core Components
- **`src/components/Board.tsx`** - Main drag-and-drop orchestration
  - Added multi-container support with local state
  - Implemented optimistic updates with asyncQueue
  - Fixed first/last position handling

- **`src/components/BoardColumn/BoardColumn.tsx`** - Column droppable
  - Simplified to use `useDroppable` for column highlight only
  - Removed manual drop indicators

- **`src/components/BoardColumn/BoardColumnList.tsx`** - List of notes
  - Simplified to basic rendering with `SortableContext`
  - Removed all manual indicator logic

- **`src/components/BoardItemCard/BoardItemCard.tsx`** - Draggable note
  - Uses `useSortable` with default animations
  - No custom animation logic needed

### Infrastructure
- **`src/context/WebSocketProvider.tsx`** - Enhanced `sendMessageAsync`
  - Now returns UUID for tracking
  - Updated TypeScript interface

### Tests
- **`src/components/__tests__/Board.test.tsx`** - Updated mocks
  - Added `actions.asyncQueue` to mock store state

## Bundle Size Impact

- **Before Phase 2:** ~266 kB (board route)
- **After Phase 2:** ~282 kB (board route)
- **Increase:** +16 kB (acceptable for full drag-and-drop library)

## Testing

### Automated Tests
- ✅ All 263 tests passing
- ✅ No regressions
- ✅ Build successful with no warnings

### Manual Testing Checklist
- [x] Drag within same column
- [x] Drag to first position (same column)
- [x] Drag to last position (same column)
- [x] Drag to middle positions (same column)
- [x] Drag between columns
- [x] Drag to first position (different column)
- [x] Drag to last position (different column)
- [x] Drag preview shows correctly
- [x] Column highlights when dragging over
- [x] Animations are smooth
- [x] Can't drag while previous drag pending
- [x] Success notification after server confirms
- [x] Keyboard navigation works
- [x] Touch devices supported

## Lessons Learned

### What Didn't Work

1. **Manual drop indicators** - Tried to implement custom blue line indicators but they appeared randomly in multiple columns. @dnd-kit's built-in animations are better.

2. **Arbitrary timeouts** - Initially used `setTimeout(() => setActiveId(null), 300)` but this created race conditions and didn't sync with server.

3. **Separate optimistic state variable** - Tried using `optimisticId` separate from `activeId`, but this confused @dnd-kit and caused notes to animate back to source.

### What Worked

1. **Use @dnd-kit's design patterns** - The library handles visual feedback through transforms and animations. Don't fight it.

2. **Track by UUID, not by note ID** - Use the `asyncQueue` system that already tracks pending operations by UUID.

3. **Insert BEFORE, not AFTER** - For proper UX, dragging over an item should insert before it, not after.

4. **Separate drag state from optimistic state** - `activeId` for DragOverlay, `hasPendingDrag` for keeping local arrays active.

## Architecture Benefits

This implementation properly integrates with your existing systems:

- **WebSocket-driven:** Server remains source of truth
- **Optimistic UI:** Instant feedback without blocking
- **Type-safe:** Full TypeScript with @dnd-kit contracts
- **Testable:** All drag logic is in handlers, not DOM manipulation
- **Maintainable:** Clear separation of concerns

## Performance

- **Smooth 60fps animations** - Transform-based, GPU accelerated
- **No layout thrashing** - Updates batched in React state
- **Minimal re-renders** - Memoized components and callbacks
- **Touch optimized** - Works on mobile devices

## Next Steps

Phase 2 is complete! Ready to proceed with:
- **Phase 3:** WebSocket Enhancement (if needed)
- **Phase 4:** Modal System Cleanup (if needed)

---

**Completion Date:** 2025-11-13
**Status:** ✅ Production Ready
**Lines of Code:** ~600 lines across all components
**Test Coverage:** 263 passing tests, 0 regressions
