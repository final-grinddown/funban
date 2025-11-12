# Frontend Refactoring Plan

**Project:** Funban - Collaborative Kanban Board
**Date:** 2025-11-12
**Status:** Planning Phase

## Overview

This document outlines a comprehensive refactoring plan for the Funban frontend. The main goals are to:

1. **Unify state management** - Consolidate Zustand, React Context, and local state patterns
2. **Improve render performance** - Eliminate visual blinks and unnecessary re-renders
3. **Simplify complex components** - Break down large files into maintainable pieces
4. **Modernize drag-drop** - Replace native DnD with a library (@dnd-kit)
5. **Enhance WebSocket handling** - Add resilience and clean up message handlers
6. **Remove code duplication** - Extract common modal patterns (98+ duplications)
7. **Improve type safety** - Replace 62 instances of `any` with proper types

---

## Current Issues Summary

### High Priority
- **Modal state duplication**: ~98 instances of identical `isSubmitting` pattern across 12+ modals
- **Excessive prop drilling**: 4+ levels deep (BoardScreen → Board → BoardColumn → BoardItemCard)
- **Large, complex components**: BoardColumn (304 lines), BoardItemCard (364 lines)
- **Mixed state management**: Zustand + Context + hooks + React Query inconsistently used
- **Render performance**: Visual blinks when moving items, likely cascading re-renders

### Medium Priority
- **Type safety**: 62 uses of `any` type, especially `sx?: any` in modals
- **Code duplication**: Modal headers, form validation repeated across 8+ files
- **Complex algorithms in components**: O(n²) linked-list sorting inline, complex drag-drop logic
- **Inconsistent error handling**: Mix of try/catch, mutation callbacks, silent failures
- **Native drag-drop complexity**: ~150 lines of fragile manual state tracking

### Low Priority
- **Dead code**: Commented sections, example files in production
- **Naming inconsistencies**: Typos (DEV_PREDECESSOORS_KEY), mixed handler naming
- **File organization**: API utilities mixed in wrong directories

---

## Refactoring Phases

## Phase 1: Foundation & Architecture

**Goal:** Establish clean state management, break down complex components, fix render performance

### Phase 1A: State Management Unification

#### Current State
- **Zustand** (in `web/src/utils/store.ts`) - Three separate stores:
  - `useThemeStore` - theme mode
  - `useFocusStateStore` - focus state (isFocus, currentUser)
  - `useActionStateStore` - notification/toast state
- **React Context** - WebSocketProvider (holds users/notes + connection), AuthProvider
- **Local hooks** - scattered useState everywhere (modal states, form states)
- **React Query** - inconsistently used for mutations

**Problem:** `users` and `notes` are stored in WebSocketProvider Context, but they're application state, not connection state. This causes:
- Can't use Zustand DevTools to inspect board data
- Difficult to test state logic independently from WebSocket
- Context API causes unnecessary re-renders when data changes

#### Target State
- **Zustand** - Single unified store as source of truth for ALL app state:
  - Board data: `users`, `notes`
  - UI state: `modals`, `focus`, `theme`
  - Notification state: `actions`
- **React Context** - Only for infrastructure providers:
  - `AuthProvider` - wraps NextAuth SessionProvider
  - `WebSocketProvider` - manages connection lifecycle ONLY (not data)
    - Provides: `connectionStatus`, `sendMessage()`, `sendMessageAsync()`
    - WebSocket message handlers update Zustand store directly
- **React Query** - All server mutations with consistent loading/error handling
- **No prop drilling** - All state accessible via Zustand selectors

#### Tasks

1. **Audit current state usage**
   - Map all useState calls in Board hierarchy
   - Identify what's in Zustand vs props vs local state vs Context
   - Document data flow for modal/focus state
   - Identify what data WebSocketProvider currently holds
   - File: Create `docs/state-audit.md` with findings

2. **Design unified Zustand store structure**
   - Consolidate existing stores (`useThemeStore`, `useFocusStateStore`, `useActionStateStore`) into single `useAppStore`
   - Create store slices for:
     - `boardSlice` - `users: User[]`, `notes: Note[]` (moved from WebSocketProvider)
     - `modalSlice` - all modal open/close state
     - `focusSlice` - focus management (merge existing `useFocusStateStore`)
     - `themeSlice` - theme mode (merge existing `useThemeStore`)
     - `actionSlice` - notifications/toasts (merge existing `useActionStateStore`)
     - `uiSlice` - any other UI-only state (drag indicators, menus)
   - Use Zustand slices pattern for modularity
   - File: `web/src/store/` (restructure)

3. **Move users/notes from WebSocketProvider to Zustand**
   - Create `boardSlice.ts` with:
     - State: `users: User[]`, `notes: Note[]`, `isLoading: boolean`
     - Actions: `setUsers()`, `setNotes()`, `updateNote()`, `updateUser()`, `addNote()`, `removeNote()`
   - Refactor WebSocketProvider:
     - Remove `users` and `notes` state from Context
     - Keep only connection-related state: `connectionStatus`, `sendMessage`, `sendMessageAsync`
     - WebSocket message handlers call Zustand actions: `useAppStore.getState().setUsers(message.items)`
   - Update components to read from Zustand instead of Context
   - Files:
     - `web/src/store/slices/boardSlice.ts` (new)
     - `web/src/context/WebSocketProvider.tsx` (refactor - remove users/notes state)
     - `web/src/components/Board.tsx` (read from Zustand, not Context)
     - All components consuming users/notes

4. **Migrate modal state to Zustand**
   - Create `modalSlice.ts` with actions: `openModal()`, `closeModal()`, `getModalState()`
   - Update BoardScreen to use store instead of useState
   - Remove modal props from Board → BoardColumn → BoardItemCard chain
   - Files:
     - `web/src/store/slices/modalSlice.ts` (new)
     - `web/src/screens/BoardScreen.tsx`
     - `web/src/components/Board.tsx`
     - `web/src/components/BoardColumn.tsx`
     - `web/src/components/BoardItemCard.tsx`

5. **Consolidate existing Zustand stores into unified store**
   - Merge `useThemeStore` into `themeSlice`
   - Merge `useFocusStateStore` into `focusSlice`
   - Merge `useActionStateStore` into `actionSlice`
   - Create single `useAppStore` that combines all slices
   - Update all imports across codebase
   - Remove old store files
   - Files:
     - `web/src/store/slices/themeSlice.ts` (new, move from utils/store.ts)
     - `web/src/store/slices/focusSlice.ts` (new, move from utils/store.ts)
     - `web/src/store/slices/actionSlice.ts` (new, move from utils/store.ts)
     - `web/src/store/index.ts` (new, exports unified useAppStore)
     - `web/src/utils/store.ts` (delete after migration)
     - All files importing old stores (search & replace)

6. **Remove focus prop drilling**
   - Remove `isFocus` and `currentUser` props from Board hierarchy
   - Components read directly from `useAppStore(state => state.focus)`
   - Files: BoardScreen, Board, BoardColumn, BoardItemCard

7. **Standardize React Query usage**
   - Audit all mutations currently using manual fetch
   - Convert to `useMutation` from @tanstack/react-query
   - Ensure consistent error/loading state handling
   - Files: All modal components (AddNewNoteModal, EditNoteModal, etc.)

8. **Remove all remaining prop drilling**
   - After all migrations complete, verify no state props are passed through hierarchy
   - Remove: `isAnyModalOpen`, `setIsAnyModalOpen`, `isFocus`, `currentUser`, etc.
   - Components should access all state via Zustand selectors
   - Verify data flow is cleaner
   - Files: BoardScreen, Board, BoardColumn, BoardItemCard

**Success Criteria:**
- ✓ Single unified `useAppStore` with all app state
- ✓ No modal/focus props passed through Board hierarchy
- ✓ All mutations use React Query
- ✓ WebSocketProvider only manages connection (not data)
- ✓ Zustand DevTools shows all state (board data, modals, focus, theme, actions)
- ✓ Components can read `users`/`notes` from Zustand, not Context

---

### Phase 1B: Component Decomposition

**Goal:** No component over 150 lines, single responsibility principle

#### Board.tsx Refactoring

**Current Issues:**
- Inline O(n²) linked-list sorting algorithm (lines 35-58)
- Uses `NaN` as sentinel value
- Mixed concerns: data transformation, loading states, rendering

**Changes:**

1. **Extract `useNoteSorting()` hook**
   - Move sorting logic to `web/src/hooks/useNoteSorting.ts`
   - Improve algorithm: pre-build predecessor map (O(n) instead of O(n²))
   - Add JSDoc comments explaining the linked-list approach
   - Add unit tests
   - Lines saved: ~30

2. **Create `BoardLoadingState` component**
   - Extract loading UI to `web/src/components/BoardLoadingState.tsx`
   - Handle skeleton states, spinners
   - Lines saved: ~20

3. **Create `BoardErrorState` component**
   - Extract error UI to `web/src/components/BoardErrorState.tsx`
   - Consistent error display
   - Lines saved: ~15

4. **Refactor Board.tsx**
   - Use extracted hook and components
   - Focus only on layout and coordination
   - Target: < 100 lines

**Files:**
- `web/src/components/Board.tsx` (refactor)
- `web/src/hooks/useNoteSorting.ts` (new)
- `web/src/components/BoardLoadingState.tsx` (new)
- `web/src/components/BoardErrorState.tsx` (new)
- `web/src/hooks/__tests__/useNoteSorting.test.ts` (new)

---

#### BoardColumn.tsx Refactoring (304 lines → ~150 lines)

**Current Issues:**
- 9 useState hooks (lines 51-59)
- Manages 3 different modals
- Complex drag-drop logic with refs and manual calculations (lines 111-151)
- Menu management
- Commented-out dead code (lines 142-149)

**Changes:**

1. **Extract `BoardColumnHeader` component**
   - Title display
   - Add note button
   - Column menu button
   - File: `web/src/components/BoardColumn/BoardColumnHeader.tsx` (new)
   - Lines: ~50

2. **Extract `BoardColumnList` component**
   - The droppable area
   - Contains only the note list rendering
   - File: `web/src/components/BoardColumn/BoardColumnList.tsx` (new)
   - Lines: ~30

3. **Extract `BoardColumnMenu` component**
   - Context menu logic
   - Edit/delete column actions
   - File: `web/src/components/BoardColumn/BoardColumnMenu.tsx` (new)
   - Lines: ~40

4. **Create `useBoardColumnModals()` hook**
   - Manages state for 3 modals: AddNote, EditColumn, DeleteColumn
   - Returns: `{ modals: { addNote, editColumn, deleteColumn }, handlers: { openAddNote, closeAddNote, ... } }`
   - File: `web/src/hooks/useBoardColumnModals.ts` (new)
   - Lines: ~40

5. **Refactor `BoardColumn.tsx`**
   - Use extracted components and hook
   - Keep drag-drop logic temporarily (will be replaced in Phase 2)
   - Remove commented code
   - Target: ~80 lines (will drop to ~50 after Phase 2 DnD migration)

**File Structure:**
```
web/src/components/BoardColumn/
├── index.tsx (re-export)
├── BoardColumn.tsx (main component, ~80 lines)
├── BoardColumnHeader.tsx (~50 lines)
├── BoardColumnList.tsx (~30 lines)
└── BoardColumnMenu.tsx (~40 lines)

web/src/hooks/
└── useBoardColumnModals.ts (~40 lines)
```

---

#### BoardItemCard.tsx Refactoring (364 lines → ~150 lines)

**Current Issues:**
- 5 separate modal states (lines 75-77)
- Complex inline styling and animations
- Multiple useEffect hooks
- Hardcoded constants: `HEADER_CONFIG_KEY`, `tagColor` object
- Mixed concerns: rendering, state, menu logic, modals

**Changes:**

1. **Extract `NoteCardHeader` component**
   - Title, user avatar, timestamp
   - File: `web/src/components/BoardItemCard/NoteCardHeader.tsx` (new)
   - Lines: ~40

2. **Extract `NoteCardTags` component**
   - Tag display with colors
   - File: `web/src/components/BoardItemCard/NoteCardTags.tsx` (new)
   - Lines: ~40

3. **Extract `NoteCardMenu` component**
   - Context menu (edit, delete, split, history, etc.)
   - File: `web/src/components/BoardItemCard/NoteCardMenu.tsx` (new)
   - Lines: ~40

4. **Create `useNoteCardModals()` hook**
   - Manages 5 modal states: Edit, Delete, Split, History, BulkDelete
   - Similar pattern to useBoardColumnModals
   - File: `web/src/hooks/useNoteCardModals.ts` (new)
   - Lines: ~50

5. **Move constants to utilities**
   - Create `web/src/utils/noteConstants.ts`
   - Move `tagColor` mapping
   - Move `HEADER_CONFIG_KEY` and other constants
   - Lines: ~30

6. **Refactor `BoardItemCard.tsx`**
   - Use extracted components and hook
   - Focus on card structure and drag-drop (temporary, until Phase 2)
   - Target: ~80 lines (will drop further after Phase 2)

**File Structure:**
```
web/src/components/BoardItemCard/
├── index.tsx (re-export)
├── BoardItemCard.tsx (main component, ~80 lines)
├── NoteCardHeader.tsx (~40 lines)
├── NoteCardTags.tsx (~40 lines)
└── NoteCardMenu.tsx (~40 lines)

web/src/hooks/
└── useNoteCardModals.ts (~50 lines)

web/src/utils/
└── noteConstants.ts (~30 lines)
```

---

#### BoardScreen.tsx Simplification

**Current Issues:**
- Passes 10+ props down to Board component
- Manages modal states that should be in Zustand

**Changes:**

1. **Simplify after Zustand migration**
   - Remove modal state props (done in Phase 1A)
   - Remove focus state props (done in Phase 1A)
   - Component should mainly handle route params and data fetching
   - Target: < 100 lines

**Files:**
- `web/src/screens/BoardScreen.tsx` (refactor)

---

### Phase 1C: Performance - Memoization

**Goal:** Eliminate visual blinks and unnecessary re-renders

#### Tasks

1. **Profile current performance**
   - Use React DevTools Profiler
   - Record drag-drop operations
   - Identify components re-rendering unnecessarily
   - Document: `docs/performance-baseline.md`

2. **Add React.memo() to BoardColumn components**
   - `BoardColumnHeader` - should only re-render if title/status changes
   - `BoardColumnList` - should only re-render if notes array changes
   - `BoardColumnMenu` - should rarely re-render
   - Files: All BoardColumn/* components

3. **Add React.memo() to BoardItemCard components**
   - `NoteCardHeader` - only re-render if note metadata changes
   - `NoteCardTags` - only re-render if tags change
   - `NoteCardMenu` - rarely re-render
   - Files: All BoardItemCard/* components

4. **Wrap event handlers with useCallback**
   - All handlers in Board.tsx
   - All handlers in BoardColumn.tsx
   - All handlers in BoardItemCard.tsx
   - Files: Board hierarchy components

5. **Optimize Zustand selectors**
   - Use shallow equality for object selections
   - Create specific selectors instead of selecting entire slices
   - Example: `useAppStore(state => state.modals.editNote)` instead of `useAppStore(state => state.modals)`
   - Files: All components using Zustand

6. **Profile after optimization**
   - Use React DevTools Profiler again
   - Verify re-renders are reduced
   - Measure blink elimination
   - Document: `docs/performance-improvements.md`

**Success Criteria:**
- ✓ Dragging a note causes < 5 component re-renders (down from potentially 50+)
- ✓ No visual blinks during drag operations
- ✓ React DevTools Profiler shows green (fast) renders
- ✓ Board with 50+ notes remains smooth

---

## Phase 2: Drag & Drop Library Migration

**Goal:** Replace native HTML5 drag-drop with @dnd-kit for better performance, maintainability, and UX

### Current Issues
- ~150 lines of complex manual drag-drop logic in BoardColumn.tsx
- Uses refs, getBoundingClientRect(), manual positioning calculations
- Fragile - breaks with CSS changes
- No animations, no accessibility support
- Commented-out code suggests it's been problematic

### Why @dnd-kit?
- **Performance**: Built-in optimizations prevent unnecessary renders
- **Accessibility**: Keyboard navigation, screen reader support out of the box
- **Maintainability**: Declarative API, no manual DOM calculations
- **Features**: Collision detection, animations, multi-drag, constraints
- **Active development**: Well-maintained, good documentation
- **Small bundle**: Modular, tree-shakeable

### Tasks

1. **Install @dnd-kit packages**
   ```bash
   yarn add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
   ```

2. **Study @dnd-kit patterns**
   - Review docs: https://docs.dndkit.com/
   - Understand DndContext, useSortable, SortableContext
   - Plan mapping of current drag logic to @dnd-kit concepts
   - Document: `docs/dnd-migration-plan.md`

3. **Wrap Board with DndContext**
   - Add `<DndContext>` wrapper in Board.tsx
   - Configure collision detection (closestCenter or closestCorners)
   - Implement `onDragStart`, `onDragEnd`, `onDragOver` handlers
   - File: `web/src/components/Board.tsx`

4. **Convert BoardColumn to use SortableContext**
   - Wrap note list with `<SortableContext items={notes}>`
   - Remove manual drag-over detection logic
   - Remove refs for drag positioning
   - File: `web/src/components/BoardColumn/BoardColumn.tsx`

5. **Convert BoardItemCard to use useSortable**
   - Use `const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: note.id })`
   - Apply transform/transition styles
   - Remove manual drag event handlers
   - File: `web/src/components/BoardItemCard/BoardItemCard.tsx`

6. **Implement drag overlay**
   - Use `<DragOverlay>` for smooth visual feedback
   - Show dragged note as overlay during drag
   - File: `web/src/components/Board.tsx`

7. **Add animations**
   - Configure transition animations
   - Add visual feedback for drop zones
   - Consider using @dnd-kit/modifiers for constraints
   - Files: Board.tsx, BoardColumn.tsx

8. **Add accessibility**
   - Test keyboard navigation (Space to pick up, arrows to move, Space to drop)
   - Test screen reader announcements
   - Add aria-labels if needed
   - Files: All drag-drop components

9. **Test thoroughly**
   - Drag within same column
   - Drag between columns
   - Drag to empty columns
   - Drag with many notes (50+)
   - Test on mobile/touch devices
   - Verify backend API calls happen correctly

**Files Modified:**
- `web/src/components/Board.tsx` (add DndContext)
- `web/src/components/BoardColumn/BoardColumn.tsx` (remove ~100 lines of manual logic)
- `web/src/components/BoardColumn/BoardColumnList.tsx` (add SortableContext)
- `web/src/components/BoardItemCard/BoardItemCard.tsx` (add useSortable)

**Success Criteria:**
- ✓ All drag-drop functionality works as before
- ✓ Keyboard navigation works
- ✓ Animations are smooth
- ✓ ~150 lines of complex code removed
- ✓ No visual blinks during drag operations
- ✓ BoardColumn.tsx drops to < 50 lines

---

## Phase 3: WebSocket Enhancement

**Goal:** Improve WebSocket resilience, clean up message handling, optimize for performance

### Current Implementation
- Custom WebSocket in `WebSocketProvider.tsx` (415 lines)
- Basic reconnection with exponential backoff
- Manual patch message handling
- Large switch statement for message types (lines 109-235)
- Identity functions `transformNote` and `transformUser` (unnecessary)

### Improvements

1. **Install reconnecting-websocket**
   ```bash
   yarn add reconnecting-websocket
   ```

2. **Refactor WebSocketProvider to use reconnecting-websocket**
   - Replace manual reconnection logic
   - Configure options: max retries, timeout, backoff
   - Simplify connection state management
   - File: `web/src/context/WebSocketProvider.tsx`

3. **Extract patch message handlers**
   - Create `web/src/websocket/handlers/` directory
   - Separate handlers: `handleNotePatch.ts`, `handleUserPatch.ts`, `handleStatusPatch.ts`, etc.
   - Each handler is a pure function: `(state, patch) => newState`
   - File: `web/src/websocket/handlers/index.ts` (exports all handlers)

4. **Remove unnecessary transformations**
   - Delete `transformNote` and `transformUser` identity functions (lines 103-104)
   - Directly use data from WebSocket messages
   - File: `web/src/context/WebSocketProvider.tsx`

5. **Optimize state updates for Zustand**
   - Ensure WebSocket patches update Zustand surgically (not full re-render)
   - Use Zustand's `immer` middleware if not already
   - Only update changed notes/users, not entire arrays
   - Files: `web/src/context/WebSocketProvider.tsx`, `web/src/store/*`

6. **Add message queuing during disconnects (optional)**
   - Queue mutations when WebSocket is disconnected
   - Send when reconnected
   - Prevent data loss during network issues
   - File: `web/src/websocket/messageQueue.ts` (new)

7. **Research TanStack Query WebSocket integration**
   - Read: https://tanstack.com/query/latest/docs/react/guides/websockets
   - Evaluate if subscriptions would simplify real-time data flow
   - Document findings: `docs/tanstack-websocket-evaluation.md`

8. **Implement TanStack Query subscriptions (optional, if beneficial)**
   - Unify REST + WebSocket data flow
   - Single source of truth for cache invalidation
   - May further reduce re-renders
   - Files: Various (depends on approach)

**Files Modified:**
- `web/src/context/WebSocketProvider.tsx` (simplify, ~300 lines after refactor)
- `web/src/websocket/handlers/` (new directory)
- `web/src/websocket/handlers/handleNotePatch.ts` (new)
- `web/src/websocket/handlers/handleUserPatch.ts` (new)
- `web/src/websocket/handlers/handleStatusPatch.ts` (new)
- `web/src/websocket/handlers/index.ts` (new)
- `web/src/websocket/messageQueue.ts` (new, optional)

**Success Criteria:**
- ✓ WebSocket reconnects automatically without user intervention
- ✓ Message handling code is modular and testable
- ✓ WebSocket patches don't cause cascading re-renders
- ✓ No data loss during brief disconnections (if queue implemented)
- ✓ WebSocketProvider.tsx < 300 lines

---

## Phase 4: Modal System Cleanup

**Goal:** Eliminate code duplication in modals, standardize patterns

### Current Issues
- **isSubmitting pattern repeated 98 times** across 12+ modals
- Modal header with close button duplicated in 8+ files
- Form validation logic duplicated
- Focus management duplicated
- No consistent modal composition pattern

### Changes

#### 1. Create `useModalSubmission()` hook

**Purpose:** Encapsulate the common `isSubmitting` + `useEffect` pattern

**Current Pattern (repeated 98 times):**
```typescript
const [isSubmitting, setIsSubmitting] = useState(false)

useEffect(() => {
  if (isSubmitting && !isLoading) {
    onClose()
  }
}, [isLoading, isSubmitting, onClose])

const handleSubmit = async () => {
  setIsSubmitting(true)
  await mutation.mutate()
}
```

**New Hook:**
```typescript
// web/src/hooks/useModalSubmission.ts
export function useModalSubmission(
  isLoading: boolean,
  onClose: () => void
) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isSubmitting && !isLoading) {
      onClose()
    }
  }, [isLoading, isSubmitting, onClose])

  return { isSubmitting, setIsSubmitting }
}
```

**Usage:**
```typescript
const { isSubmitting, setIsSubmitting } = useModalSubmission(mutation.isLoading, onClose)
```

**Files to update:** All 12+ modal components

---

#### 2. Create `<ModalHeader>` component

**Purpose:** Standardized header with title and close button

**Current Pattern (repeated 8+ times):**
```typescript
<DialogTitle sx={{
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  pb: 0
}}>
  Delete Note
  <IconButton edge="end" color="inherit" onClick={onClose}>
    <CloseIcon />
  </IconButton>
</DialogTitle>
```

**New Component:**
```typescript
// web/src/components/modals/ModalHeader.tsx
interface ModalHeaderProps {
  title: string
  onClose: () => void
  icon?: React.ReactNode
}

export function ModalHeader({ title, onClose, icon }: ModalHeaderProps) {
  return (
    <DialogTitle sx={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      pb: 0
    }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {icon}
        {title}
      </Box>
      <IconButton edge="end" color="inherit" onClick={onClose}>
        <CloseIcon />
      </IconButton>
    </DialogTitle>
  )
}
```

**Usage:**
```typescript
<ModalHeader title="Delete Note" onClose={onClose} />
```

---

#### 3. Consolidate form validation patterns

**Purpose:** Reusable form field validation

**Create:**
- `web/src/hooks/useFormField.ts` - Single field with validation
- `web/src/hooks/useFormFields.ts` - Multiple fields with validation
- `web/src/utils/validators.ts` - Common validators (required, minLength, etc.)

**Example:**
```typescript
// web/src/hooks/useFormField.ts
export function useFormField(
  initialValue: string,
  validator?: (value: string) => string | null
) {
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState<string | null>(null)

  const validate = useCallback(() => {
    if (validator) {
      const err = validator(value)
      setError(err)
      return err === null
    }
    return true
  }, [value, validator])

  return { value, setValue, error, validate }
}
```

---

#### 4. Standardize focus management in modals

**Create:**
```typescript
// web/src/hooks/useModalFocus.ts
export function useModalFocus(
  open: boolean,
  selector: string = 'input, textarea'
) {
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        const element = document.querySelector(selector) as HTMLElement
        element?.focus()
      }, 100)
    }
  }, [open, selector])
}
```

**Usage:**
```typescript
useModalFocus(open, 'input[name="title"]')
```

---

### Refactoring Tasks

1. **Create shared modal utilities**
   - File: `web/src/hooks/useModalSubmission.ts` (new)
   - File: `web/src/hooks/useModalFocus.ts` (new)
   - File: `web/src/components/modals/ModalHeader.tsx` (new)

2. **Create form utilities**
   - File: `web/src/hooks/useFormField.ts` (new)
   - File: `web/src/hooks/useFormFields.ts` (new)
   - File: `web/src/utils/validators.ts` (new)

3. **Refactor AddNewNoteModal**
   - Use `useModalSubmission()`
   - Use `<ModalHeader>`
   - Use `useFormField()` for title/description
   - Use `useModalFocus()`
   - File: `web/src/components/AddNewNoteModal.tsx`

4. **Refactor EditNoteModal**
   - Same pattern as AddNewNoteModal
   - File: `web/src/components/EditNoteModal.tsx`

5. **Refactor DeleteNoteModal**
   - Use `useModalSubmission()`
   - Use `<ModalHeader>`
   - File: `web/src/components/DeleteNoteModal.tsx`

6. **Refactor SplitNoteModal**
   - Same pattern
   - File: `web/src/components/SplitNoteModal.tsx`

7. **Refactor DeleteNoteBulkModal**
   - Same pattern
   - File: `web/src/components/DeleteNoteBulkModal.tsx`

8. **Refactor EndStatusModal**
   - Same pattern
   - File: `web/src/components/EndStatusModal.tsx`

9. **Refactor remaining modals**
   - Apply patterns to all other modals
   - Files: `web/src/components/*Modal.tsx`

**Files Created:**
```
web/src/hooks/
├── useModalSubmission.ts (new, ~20 lines)
├── useModalFocus.ts (new, ~15 lines)
├── useFormField.ts (new, ~25 lines)
└── useFormFields.ts (new, ~40 lines)

web/src/components/modals/
└── ModalHeader.tsx (new, ~30 lines)

web/src/utils/
└── validators.ts (new, ~30 lines)
```

**Files Modified:**
- All modal components (12+ files)

**Success Criteria:**
- ✓ No duplicated `isSubmitting` patterns
- ✓ Consistent modal headers across all modals
- ✓ Consistent form validation approach
- ✓ All modals < 150 lines
- ✓ Code savings: ~200+ lines eliminated

---

## Phase 5: Polish & Cleanup

**Goal:** Fix remaining issues, improve code quality, standardize patterns

### Type Safety Improvements

#### 1. Fix TypeScript `any` types in MUI components

**Issue:** 62 instances of `sx?: any` in components

**Solution:**
```typescript
// web/src/types/mui.ts (new)
import { SxProps, Theme } from '@mui/material/styles'

export type MuiSxProps = SxProps<Theme>
```

**Files to update:**
- `web/src/components/NoteTextFieldController.tsx`
- All modal components
- Any component with `sx?: any` prop

#### 2. Fix `fetchWithAuth` typing

**Current:**
```typescript
body?: any
```

**Solution:**
```typescript
// web/src/app/api/fetchWithAuth.ts
interface FetchOptions<TBody = unknown> {
  method?: string
  body?: TBody
  headers?: Record<string, string>
}

export async function fetchWithAuth<TResponse, TBody = unknown>(
  url: string,
  options?: FetchOptions<TBody>
): Promise<TResponse> {
  // ...
}
```

**Files:**
- `web/src/app/api/fetchWithAuth.ts`

---

### Code Cleanup

#### 3. Remove dead/commented code

**Files:**
- `web/src/components/BoardColumn.tsx` (lines 142-149) - commented drag logic
- Search codebase for other commented blocks

#### 4. Remove or relocate example files

**Files:**
- `web/src/app/history/[id]/page-with-use-hook.example.tsx`
  - Move to `docs/examples/` or delete if no longer needed

---

### Bug Fixes

#### 5. Fix typo in storage key

**File:** `web/src/utils/storage.ts` (line 10)

**Change:**
```typescript
// Before
const DEV_PREDECESSOORS_KEY = createPrefixedKey("dev-predecessors")

// After
const DEV_PREDECESSORS_KEY = createPrefixedKey("dev-predecessors")
```

**Impact:** Update all references to this constant

---

### Error Handling Standardization

#### 6. Create Error Boundary component

**Purpose:** Catch React errors and display fallback UI

**File:** `web/src/components/ErrorBoundary.tsx` (new)

```typescript
interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export class ErrorBoundary extends React.Component<Props, { hasError: boolean }> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
    // TODO: Send to error reporting service
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong.</div>
    }
    return this.props.children
  }
}
```

**Usage:** Wrap app or major sections in `<ErrorBoundary>`

#### 7. Create centralized error handling utility

**Purpose:** Consistent error messages and logging

**File:** `web/src/utils/errorHandler.ts` (new)

```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function handleError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }

  if (error instanceof Error) {
    return new AppError(error.message)
  }

  return new AppError('An unknown error occurred')
}

export function displayError(error: unknown) {
  const appError = handleError(error)
  // TODO: Show toast/snackbar
  console.error(appError)
}
```

#### 8. Fix silent 401 handling in fetchWithAuth

**Issue:** Currently calls `clearApp()` silently without notifying user

**File:** `web/src/app/api/fetchWithAuth.ts` (line 29)

**Change:**
```typescript
// Before
if (response.status === 401) {
  clearApp()
  return
}

// After
if (response.status === 401) {
  displayError(new AppError('Session expired. Please log in again.', 'AUTH_EXPIRED', 401))
  clearApp()
  return
}
```

---

### File Organization

#### 9. Reorganize file structure

**Changes:**

```
# Before
web/src/app/api/
├── fetchWithAuth.ts
├── fetches.ts
├── client.ts
└── websocket.ts

# After
web/src/lib/
├── api/
│   ├── client.ts
│   ├── fetchWithAuth.ts
│   └── fetches.ts
└── websocket/
    └── websocket.ts
```

**Files to move:**
- `web/src/app/api/fetchWithAuth.ts` → `web/src/lib/api/fetchWithAuth.ts`
- `web/src/app/api/fetches.ts` → `web/src/lib/api/fetches.ts`
- `web/src/app/api/client.ts` → `web/src/lib/api/client.ts`
- `web/src/app/api/websocket.ts` → `web/src/lib/websocket/websocket.ts`

**Update imports:** Search and replace all import paths

---

### Naming Conventions

#### 10. Standardize handler naming

**Rule:**
- `handle*` - for event handlers defined in the component
- `on*` - for callback props passed to the component

**Example:**
```typescript
// Component that receives callback
interface Props {
  onSubmit: (data: FormData) => void  // Callback prop
  onCancel: () => void                // Callback prop
}

// Inside component
function MyForm({ onSubmit, onCancel }: Props) {
  const handleSubmit = (e: FormEvent) => {  // Event handler
    e.preventDefault()
    onSubmit(formData)
  }

  const handleInputChange = (e: ChangeEvent) => {  // Event handler
    // ...
  }

  return <form onSubmit={handleSubmit}>...</form>
}
```

**Files:** Audit and fix inconsistent naming across all components

---

### Final Review

#### 11. Verify component size constraints

**Script:** Create a script to check component line counts

```bash
# web/scripts/check-component-sizes.sh
find src/components -name "*.tsx" -exec wc -l {} \; | sort -rn | awk '$1 > 150 { print $2 " has " $1 " lines (> 150)" }'
```

**Action:** Ensure all components pass (< 150 lines)

#### 12. Verify no prop drilling

**Manual audit:**
- Check BoardScreen → Board → BoardColumn → BoardItemCard
- Ensure no state/callbacks passed more than 2 levels

#### 13. Run full test suite

```bash
cd web
yarn test
```

**Action:** Fix any broken tests from refactoring

#### 14. Final performance profiling

**Actions:**
- Use React DevTools Profiler
- Record drag-drop operations
- Compare to baseline (from Phase 1C)
- Verify blinks eliminated
- Document: `docs/performance-final.md`

---

## Success Metrics (Summary)

### Quantitative
- ✓ No component over 150 lines
- ✓ No prop drilling beyond 2 levels
- ✓ Eliminated ~200+ lines of duplicated code
- ✓ Removed 62 instances of `any` type
- ✓ Reduced re-renders by 90%+ (measured via Profiler)
- ✓ 0 visual blinks during drag operations

### Qualitative
- ✓ Consistent state management pattern (Zustand + React Query)
- ✓ All components have single responsibility
- ✓ All components are testable (< 150 lines, clear inputs/outputs)
- ✓ Drag-drop logic is declarative and maintainable
- ✓ WebSocket handling is resilient and clean
- ✓ Modal patterns are consistent and DRY
- ✓ Type safety is improved across the board
- ✓ Error handling is consistent and user-friendly

### User Experience
- ✓ Drag-drop feels smooth and responsive
- ✓ No visual glitches or blinks
- ✓ Keyboard navigation works in drag-drop
- ✓ Error messages are clear and helpful
- ✓ Loading states are consistent

---

## Implementation Notes

### Execution Order
Phases must be executed in order (1 → 2 → 3 → 4 → 5) because:
- Phase 2 (DnD) depends on Phase 1 (clean components)
- Phase 3 (WebSocket) depends on Phase 1 (Zustand state)
- Phase 4 (Modals) is independent but easier after Phase 1
- Phase 5 (Polish) happens last

### Testing Strategy
- **After each phase:** Run full test suite
- **During Phase 1:** Add React DevTools profiling
- **During Phase 2:** Manual testing of all drag-drop scenarios
- **After Phase 3:** Test WebSocket reconnection and edge cases
- **After Phase 5:** Full regression test

### Risk Mitigation
- **Backup before starting:** Create branch `feature/frontend_refactoring_backup`
- **Small commits:** Commit after each major component refactor
- **Review diffs carefully:** Ensure no functionality is lost
- **Test incrementally:** Don't wait until end of phase to test

### Estimated Effort
- **Phase 1:** 3-5 days (largest phase)
  - 1A: 1 day
  - 1B: 2-3 days
  - 1C: 0.5-1 day
- **Phase 2:** 1-2 days
- **Phase 3:** 1-2 days
- **Phase 4:** 1-2 days
- **Phase 5:** 1 day

**Total:** 7-12 days (depending on team size and experience)

---

## Open Questions

1. ~~**State management:** Confirm Zustand as primary choice vs Context API?~~ ✓ **RESOLVED:** Zustand for all app state, Context only for providers (Auth, WS connection)
2. **TanStack Query WebSocket:** Worth investigating or stick with current approach?
3. **Component library:** Any other MUI components that need refactoring?
4. **Testing:** Should we add integration tests during refactoring?
5. **Performance targets:** What's acceptable render time for drag operations?

---

## Appendix: File Structure After Refactoring

```
web/src/
├── app/                          # Next.js app router (pages only)
│   ├── board/[id]/
│   ├── history/[id]/
│   └── ...
├── components/
│   ├── Board.tsx                 # Simplified (~100 lines)
│   ├── BoardColumn/              # Decomposed
│   │   ├── index.tsx
│   │   ├── BoardColumn.tsx       # ~50 lines (after Phase 2)
│   │   ├── BoardColumnHeader.tsx
│   │   ├── BoardColumnList.tsx
│   │   └── BoardColumnMenu.tsx
│   ├── BoardItemCard/            # Decomposed
│   │   ├── index.tsx
│   │   ├── BoardItemCard.tsx     # ~80 lines
│   │   ├── NoteCardHeader.tsx
│   │   ├── NoteCardTags.tsx
│   │   └── NoteCardMenu.tsx
│   ├── modals/
│   │   ├── ModalHeader.tsx       # New shared component
│   │   ├── AddNewNoteModal.tsx   # Refactored
│   │   ├── EditNoteModal.tsx     # Refactored
│   │   └── ...
│   ├── BoardLoadingState.tsx     # New
│   ├── BoardErrorState.tsx       # New
│   └── ErrorBoundary.tsx         # New
├── context/
│   ├── AuthProvider.tsx
│   └── WebSocketProvider.tsx     # Simplified (~300 lines)
├── hooks/
│   ├── useNoteSorting.ts         # Extracted from Board
│   ├── useBoardColumnModals.ts   # Extracted from BoardColumn
│   ├── useNoteCardModals.ts      # Extracted from BoardItemCard
│   ├── useModalSubmission.ts     # New shared hook
│   ├── useModalFocus.ts          # New shared hook
│   ├── useFormField.ts           # New shared hook
│   ├── useFormFields.ts          # New shared hook
│   └── __tests__/
│       └── useNoteSorting.test.ts
├── lib/                          # New: shared utilities
│   ├── api/
│   │   ├── client.ts
│   │   ├── fetchWithAuth.ts
│   │   └── fetches.ts
│   └── websocket/
│       └── websocket.ts
├── screens/
│   └── BoardScreen.tsx           # Simplified (~100 lines)
├── store/                        # Unified Zustand store
│   ├── index.ts                  # Exports unified useAppStore
│   └── slices/
│       ├── boardSlice.ts         # New: users, notes (from WebSocketProvider)
│       ├── modalSlice.ts         # New: all modal state
│       ├── focusSlice.ts         # Merged from useFocusStateStore
│       ├── themeSlice.ts         # Merged from useThemeStore
│       ├── actionSlice.ts        # Merged from useActionStateStore
│       └── uiSlice.ts            # New: other UI state
├── types/
│   └── mui.ts                    # New: MUI types
├── utils/
│   ├── errorHandler.ts           # New
│   ├── noteConstants.ts          # New
│   ├── validators.ts             # New
│   └── storage.ts                # Fixed typo
│   # store.ts DELETED - migrated to store/
└── websocket/                    # New: WebSocket utilities
    ├── handlers/
    │   ├── index.ts
    │   ├── handleNotePatch.ts
    │   ├── handleUserPatch.ts
    │   └── handleStatusPatch.ts
    └── messageQueue.ts           # Optional

docs/                             # Documentation
├── state-audit.md                # Phase 1A output
├── performance-baseline.md       # Phase 1C output
├── performance-improvements.md   # Phase 1C output
├── performance-final.md          # Phase 5 output
├── dnd-migration-plan.md         # Phase 2 output
└── tanstack-websocket-evaluation.md  # Phase 3 output (optional)
```

---

## Version History

- **v1.0** (2025-11-12): Initial plan created
- **v1.1** (2025-11-12): Updated Phase 1A to clarify Context vs Zustand separation
  - Added task to move `users`/`notes` from WebSocketProvider to Zustand
  - Consolidated existing Zustand stores into unified `useAppStore`
  - Clarified WebSocketProvider should only manage connection, not data
  - Updated file structure appendix to reflect unified store architecture
- **v2.0** (TBD): Updates after Phase 1 completion
- **v3.0** (TBD): Updates after full refactoring

---

**Last Updated:** 2025-11-12 (v1.1)
**Status:** Ready for review and approval
**Next Step:** Review plan with team, get approval, start Phase 1A
