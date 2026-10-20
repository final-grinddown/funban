# Drag & Drop Migration Plan - @dnd-kit

**Date:** 2025-11-13
**Status:** Phase 2 - In Progress

## Overview

Migrating from native HTML5 drag-and-drop to @dnd-kit to improve maintainability, performance, and user experience.

## Current Implementation Analysis

### Board.tsx
- **handleDragStart**: Sets `draggingItemIdRef.current` and stops propagation
- **handleDrop**: Finds dragged note, creates WebSocket message (reorder before or reorder last)
- **handleDragEnd**: Clears refs and hovered column state
- Uses refs to track dragging state (`draggingItemIdRef`)

### BoardColumn.tsx
- **Complex drag-over detection** (~30 lines):
  - Uses `getBoundingClientRect()` to calculate midpoints
  - Tracks which element is being hovered over
  - Updates `draggedOverId` state for placeholder positioning
  - Manages `lastHoveredRef` to track column changes
- **handleDrop**: Handles drop within column
- **handleDragLeave**: Clears state when drag leaves column
- **handleDragEnter**: Sets `isDraggingOver` flag

### BoardItemCard.tsx
- **handleDrag**: Manages drag start/end, sets cursor styles
- **Draggable card**: Uses native `draggable={isEditable}`
- Tracks `isDragging` state for UI feedback

### BoardColumnList.tsx
- Receives drag handlers as props
- Renders placeholder based on `draggedOverId`
- Maps over items with drag-over detection per card

## @dnd-kit Architecture

### Key Concepts

1. **DndContext**: Top-level provider managing drag state
   - Collision detection strategies
   - Sensors (mouse, keyboard, touch)
   - Event handlers (onDragStart, onDragEnd, onDragOver)

2. **SortableContext**: Wraps sortable lists
   - Manages items array
   - Handles reordering logic
   - Strategy: verticalListSortingStrategy, etc.

3. **useSortable**: Hook for draggable items
   - Returns: `{ attributes, listeners, setNodeRef, transform, transition }`
   - Handles drag state automatically
   - Provides transform for smooth animations

4. **DragOverlay**: Optional portal for drag preview
   - Shows custom preview while dragging
   - Prevents layout shift during drag

### Funban-Specific Requirements

1. **Multi-column board**: Notes can be dragged between columns
2. **Predecessor-based ordering**: Notes use linked-list ordering (predecessor_id)
3. **Cross-column drops**: Need to handle state changes when dropping in different column
4. **Placeholder positioning**: Insert between notes, not just append
5. **Focus mode**: Some notes might be hidden/faded
6. **Editable vs read-only**: Only editable boards allow dragging

## Migration Strategy

### Phase 2A: Setup DndContext (Board.tsx)

**Changes:**
1. Wrap entire Board with `<DndContext>`
2. Configure sensors: `useSensor(MouseSensor)`, `useSensor(TouchSensor)`, `useSensor(KeyboardSensor)`
3. Set collision detection: `closestCenter` or `closestCorners`
4. Implement handlers:
   - `handleDragStart`: Track active note
   - `handleDragOver`: Track which column/position
   - `handleDragEnd`: Send WebSocket update

**Key decision:** Use `@dnd-kit/sortable` with custom strategy or implement custom collision?
- **Decision**: Use `verticalListSortingStrategy` per column + custom cross-column logic

**Code structure:**
```typescript
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

const sensors = useSensors(
  useSensor(PointerSensor),
  useSensor(KeyboardSensor)
)

return (
  <DndContext
    sensors={sensors}
    collisionDetection={closestCenter}
    onDragStart={handleDragStart}
    onDragOver={handleDragOver}
    onDragEnd={handleDragEnd}
  >
    {/* Board columns */}
    <DragOverlay>{activeNote && <BoardItemCard {...activeNote} />}</DragOverlay>
  </DndContext>
)
```

### Phase 2B: Convert BoardColumn (BoardColumn.tsx)

**Remove:**
- All manual drag-over detection logic (~30 lines)
- `handleDragOver`, `handleDrop`, `handleDragLeave`, `handleDragEnter` functions
- `draggedOverId`, `isDraggingOver`, `lastHoveredRef` state
- `useCallback` wrappers for removed handlers

**Add:**
- Wrap `BoardColumnList` content with `<SortableContext>`
- Pass `items={items.map(i => i.id)}` to SortableContext
- Use `verticalListSortingStrategy`

**Code structure:**
```typescript
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'

const { setNodeRef } = useDroppable({
  id: title, // Use column title as droppable ID
})

return (
  <Box ref={setNodeRef}>
    <BoardColumnHeader />
    <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
      <BoardColumnList items={items} />
    </SortableContext>
  </Box>
)
```

**Expected reduction:** 227 lines → ~120 lines (remove ~107 lines of drag logic)

### Phase 2C: Convert BoardItemCard (BoardItemCard.tsx)

**Remove:**
- `onDragStart`, `onDragEnd` props
- `handleDrag` function
- Manual `draggable={isEditable}`, `onDragStart`, `onDragEnd` attributes
- `isDragging` state
- Manual cursor style changes

**Add:**
- `useSortable({ id: note.id })` hook
- Apply transform/transition styles to Card
- Use `setNodeRef`, `attributes`, `listeners` from hook

**Code structure:**
```typescript
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
  id: id,
  disabled: !isEditable,
})

const style = {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0.5 : 1,
}

return (
  <Card
    ref={setNodeRef}
    style={style}
    {...attributes}
    {...listeners}
    sx={{
      cursor: isEditable ? 'grab' : 'default',
      // ... other styles
    }}
  >
    {/* Card content */}
  </Card>
)
```

**Note:** Need to handle context menu separately (right-click shouldn't trigger drag)

### Phase 2D: Implement DragOverlay (Board.tsx)

**Purpose:** Show dragged card as overlay, preventing layout shift

**Implementation:**
```typescript
const [activeId, setActiveId] = useState<string | null>(null)
const activeNote = notes.find(n => n.id.toString() === activeId)

const handleDragStart = (event: DragStartEvent) => {
  setActiveId(event.active.id as string)
}

const handleDragEnd = (event: DragEndEvent) => {
  setActiveId(null)
  // ... handle drop logic
}

return (
  <DndContext ...>
    {/* ... board content */}
    <DragOverlay>
      {activeNote && <BoardItemCard {...activeNote} isEditable={false} />}
    </DragOverlay>
  </DndContext>
)
```

### Phase 2E: Handle Cross-Column Drops

**Challenge:** @dnd-kit's `verticalListSortingStrategy` is designed for single lists

**Solution:** Use `onDragOver` to detect column changes

**Implementation:**
```typescript
const handleDragOver = (event: DragOverEvent) => {
  const { active, over } = event

  if (!over) return

  const activeColumn = findColumnByNoteId(active.id)
  const overColumn = findColumnByNoteId(over.id) || over.id // over.id might be column ID

  if (activeColumn !== overColumn) {
    // Note moved to different column
    // Update UI optimistically (Zustand state update)
  }
}

const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event

  if (!over) return

  // Determine new position (before which note, or last)
  const draggedNote = notes.find(n => n.id === active.id)
  const overNote = notes.find(n => n.id === over.id)

  // Send WebSocket message
  if (overNote) {
    sendMessageAsync(createUpdateNoteReorderBefore(draggedNote.id, overNote.id))
  } else {
    sendMessageAsync(createUpdateNoteReorderLast(draggedNote.id, newState))
  }
}
```

### Phase 2F: Add Accessibility

**Features:**
1. **Keyboard navigation**:
   - Space: Pick up item
   - Arrow keys: Move between items
   - Space: Drop item
   - Escape: Cancel drag

2. **Screen reader announcements**:
   - Automatic via @dnd-kit
   - Can customize with `announcements` prop

**Implementation:**
```typescript
import { KeyboardSensor } from '@dnd-kit/core'

const sensors = useSensors(
  useSensor(PointerSensor),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates, // For sortable lists
  })
)
```

### Phase 2G: Add Animations

**Features:**
1. **Smooth transitions** during reordering
2. **Drop animations** when releasing
3. **Column highlight** when dragging over

**Implementation:**
```typescript
import { defaultAnimateLayoutChanges } from '@dnd-kit/sortable'

const { ... } = useSortable({
  id: id,
  animateLayoutChanges: defaultAnimateLayoutChanges,
  transition: {
    duration: 200,
    easing: 'ease-in-out',
  },
})
```

## Testing Plan

### Manual Testing

1. **Within column**:
   - Drag note up in same column
   - Drag note down in same column
   - Drop between notes
   - Drop at top
   - Drop at bottom

2. **Cross-column**:
   - Drag from NOTES → TODO
   - Drag from TODO → IN PROGRESS
   - Drag from IN PROGRESS → DONE
   - Drag from DONE → NOTES (reverse flow)

3. **Edge cases**:
   - Drag to empty column
   - Drag with 50+ notes (performance)
   - Drag in focus mode (with faded notes)
   - Cancel drag (Escape key)

4. **Accessibility**:
   - Tab to note
   - Space to pick up
   - Arrow keys to move
   - Space to drop
   - Escape to cancel
   - Test with screen reader

5. **Mobile/Touch**:
   - Touch drag on mobile
   - Long press to start drag
   - Verify touch feedback

### Automated Testing

1. **Unit tests**:
   - Test drag handlers
   - Test note reordering logic
   - Test predecessor calculation

2. **Integration tests** (future):
   - Test WebSocket message sending
   - Test optimistic updates
   - Test error handling

## Risk Mitigation

### Potential Issues

1. **Context menu conflicts**: Right-click might trigger drag
   - **Solution**: Use `activationConstraint` with `delay` or `distance`

2. **Performance with many notes**: 50+ notes might lag
   - **Solution**: Profile with React DevTools, add virtualization if needed

3. **Predecessor calculation**: Complex linked-list logic
   - **Solution**: Keep existing calculation logic, just wire up differently

4. **Focus mode interaction**: Faded notes shouldn't be droppable
   - **Solution**: Use `disabled` prop on useSortable for hidden notes

5. **WebSocket sync**: Optimistic updates might conflict
   - **Solution**: Keep optimistic updates minimal, rely on server state

## Success Criteria

- ✓ All drag-drop functionality works as before
- ✓ Keyboard navigation works (Space, arrows, Escape)
- ✓ Smooth animations during drag
- ✓ No visual glitches or layout shifts
- ✓ Performance is smooth with 50+ notes
- ✓ ~100-150 lines of complex code removed
- ✓ BoardColumn.tsx < 150 lines
- ✓ Code is more maintainable
- ✓ Accessibility improved

## Implementation Order

1. ✅ Install @dnd-kit packages
2. 📝 Create migration plan (this document)
3. Board.tsx - Add DndContext wrapper
4. BoardItemCard.tsx - Convert to useSortable
5. BoardColumn.tsx - Remove manual drag logic, add SortableContext
6. Board.tsx - Add DragOverlay
7. Test basic drag-drop
8. Add accessibility features
9. Add animations
10. Test thoroughly (all scenarios)
11. Update documentation

## Rollback Plan

If migration fails or causes issues:
1. Revert to previous commit
2. Keep @dnd-kit installed for future attempt
3. Document what went wrong
4. Consider alternative approaches

## Notes

- @dnd-kit uses **pointer events** instead of mouse/touch separately
- Transform is applied via `style`, not className
- Active drag state is managed by DndContext
- Each draggable needs unique `id` (using `note.id`)
- Columns can be droppable zones using `useDroppable`
- Can customize drag preview with DragOverlay

## References

- @dnd-kit docs: https://docs.dndkit.com/
- Sortable example: https://docs.dndkit.com/presets/sortable
- Multi-container: https://docs.dndkit.com/presets/sortable/multiple-containers
- Accessibility: https://docs.dndkit.com/guides/accessibility
