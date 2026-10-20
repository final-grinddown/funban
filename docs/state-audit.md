# State Management Audit

**Date:** 2025-11-12
**Status:** Phase 1A.1 Complete

## Current State Architecture

### 1. Zustand Stores (web/src/utils/store.ts)

Three separate stores currently exist:

#### `useThemeStore`
- **State:** `mode: TThemeMode` ("light" | "dark" | "system")
- **Actions:** `setMode()`, `initializeTheme()`
- **Persistence:** localStorage via `getStoredTheme()`, `setStoredTheme()`
- **Usage:** Global theme management
- **Files using it:** `_provider.tsx`, layout components

#### `useFocusStateStore`
- **State:**
  - `isFocus: boolean` - whether focus mode is active
  - `currentUser: string` - name of currently focused user
- **Actions:** `setIsFocus()`, `setCurrentUser()`
- **Usage:** Focus mode for filtering board by single user
- **Files using it:**
  - `BoardScreen.tsx` (line 28-29)
  - `BoardItemCard.tsx` (line 67)
  - Board hierarchy

#### `useActionStateStore`
- **State:**
  - `visibleAction: string | null` - toast message to display
  - `asyncQueue: Action[]` - queue of pending async operations
- **Actions:** `startAsync()`, `finishAsync()`, `fire()`, `close()`
- **Usage:** Toast notifications and async operation tracking
- **Files using it:**
  - `WebSocketProvider.tsx` (line 70)
  - `Alerts.tsx` (consumes visibleAction)

### 2. React Context

#### `WebSocketProvider` (web/src/context/WebSocketProvider.tsx)
**Problem:** Currently holds both connection infrastructure AND application data

**Current State:**
- `users: User[]` (line 62) ❌ **Should be in Zustand**
- `notes: Note[]` (line 63) ❌ **Should be in Zustand**
- `socketUrl: string | null` (line 64) ✓ Connection state (correct)
- `socketRef: useRef<WebSocket>` (line 65) ✓ Connection state (correct)
- `isLoading: boolean` (line 66) ✓ Connection state (correct)
- `reconnectDelayRef: useRef<number>` (line 67) ✓ Connection state (correct)
- Various reconnection refs ✓ Connection state (correct)

**Context Value Provided:**
```typescript
{
  users,           // ❌ Should be in Zustand
  notes,           // ❌ Should be in Zustand
  sendMessage,     // ✓ Keep in Context
  sendMessageAsync,// ✓ Keep in Context
  connectionStatus,// ✓ Keep in Context
  isLoading        // ✓ Keep in Context
}
```

**Message Handlers (lines 106-239):**
- `handlePatchMessage()` - processes WebSocket patches
- Updates users/notes state via React setState
- ❌ **Should update Zustand store instead**

**Usage:**
- `BoardScreen.tsx` - reads users/notes, calls sendMessageAsync
- `Board.tsx` - reads isLoading for loading backdrop
- `BoardColumn.tsx` - reads users
- `BoardItemCard.tsx` - reads users
- All modal components - call sendMessageAsync

#### `AuthProvider` (web/src/context/AuthProvider.tsx)
- Wraps NextAuth SessionProvider
- ✓ Correct use of Context (infrastructure)

### 3. Local Component State (useState)

#### BoardScreen.tsx (web/src/screens/BoardScreen.tsx)
**Modal States (via `useBoardModalManagement` hook):**
- `isEndStatusModalOpen` (line 32)
- `isAddNewNoteModalOpen` (line 33)
- `isAddUserMarkModalOpen` (line 34)
- `anchorEl` (line 35) - menu anchor
- `openMenu` (line 36) - menu open state
- `isAnyModalOpen` (line 45)

**User Selection State (via `useUserSelection` hook):**
- `user: string` - selected user ID

**Focus State:**
- Uses `useFocusStateStore` from Zustand ✓ (but still props drill to children)

**Props Passed Down to Board:**
- `notes` (from WebSocketContext) ❌ prop drilling
- `isAnyModalOpen` ❌ prop drilling
- `setIsAnyModalOpen` ❌ prop drilling
- `isFocus` ❌ prop drilling
- `currentUser` ❌ prop drilling
- `selectedUserId` ❌ prop drilling

#### Board.tsx (web/src/components/Board.tsx)
**Local State:**
- `draggingItemIdRef: useRef<string | null>` (line 30) - drag state
- `hoveredColumn: string | null` (line 31) - drag visual feedback

**Receives Props:** (lines 20-28)
- `notes` (from parent) ❌ should read from Zustand
- `isAnyModalOpen` ❌ prop drilled
- `setIsAnyModalOpen` ❌ prop drilled
- `isFocus` ❌ prop drilled
- `currentUser` ❌ prop drilled
- `selectedUserId` ❌ prop drilled

**Passes Props to BoardColumn:** (lines 136-154)
- All of the above + more ❌ Deep prop drilling

#### BoardColumn.tsx (web/src/components/BoardColumn.tsx)
**Local State (9 useState hooks!):**
- `draggedOverId: number | "last" | null` (line 51) - drag drop logic
- `lastHoveredRef: useRef<string | null>` (line 52) - drag feedback
- `isDraggingOver: boolean` (line 53) - drag visual
- `anchorEl: HTMLElement | null` (line 54) - context menu
- `openMenu: boolean` (line 55) - context menu state
- `textFocus: boolean` (line 56) - autofocus for modal
- `isAddNewNoteModalOpen: boolean` (line 57) ❌ **Should be in Zustand**
- `isDeleteNoteBulkModalOpen: boolean` (line 58) ❌ **Should be in Zustand**
- `newNoteDefaultValues` (line 59) - form defaults

**Receives Props:** (lines 14-30)
- `isAnyModalOpen` ❌ prop drilled from BoardScreen
- `setIsAnyModalOpen` ❌ prop drilled from BoardScreen
- `isFocus` ❌ prop drilled from BoardScreen
- `currentUser` ❌ prop drilled from BoardScreen
- Plus drag-drop handlers and column data

**Passes Props to BoardItemCard:** (lines 268-274)
- Drag handlers
- Note data

#### BoardItemCard.tsx (web/src/components/BoardItemCard.tsx)
**Local State:**
- `contextMenu: {mouseX, mouseY} | null` (line 71-73) - context menu position
- `editModal` (line 75) - via `useSimpleModal()` hook ❌ **Should be in Zustand**
- `deleteModal` (line 76) - via `useSimpleModal()` hook ❌ **Should be in Zustand**
- `splitModal` (line 77) - via `useSimpleModal()` hook ❌ **Should be in Zustand**
- `isSubmitting: boolean` (line 78) - submission state
- `isDragging: boolean` (line 79) - drag state
- `textFocus: boolean` (line 80) - autofocus
- `openMenu: boolean` (line 81) - context menu open

**Reads from Zustand:**
- `useFocusStateStore()` (line 67) - `isFocus`, `currentUser` ✓ Good!

**Reads from Context:**
- `useWebSocketContext()` (line 66) - users, isLoading, sendMessageAsync

### 4. React Query

**Current Usage:**
- ❌ NOT consistently used for mutations
- Most mutations use `sendMessageAsync()` directly via WebSocket
- No centralized error handling
- No loading state management (relies on WebSocket `isLoading`)

**Files that should use React Query:**
- All modal components (mutations)
- EndStatusModal (HTTP POST)
- Any REST API calls

## Data Flow Analysis

### Current Flow (Problematic)
```
WebSocket message arrives
    ↓
WebSocketProvider.handlePatchMessage()
    ↓
setState(users) / setState(notes)
    ↓
Context value updates
    ↓
All consumers re-render (cascading)
    ↓
BoardScreen re-renders
    ↓
Board re-renders
    ↓
All BoardColumns re-render
    ↓
All BoardItemCards re-render ❌ PERFORMANCE ISSUE
```

### Prop Drilling Chain
```
BoardScreen
  ├─ isFocus (from useFocusStateStore)
  ├─ currentUser (from useFocusStateStore)
  ├─ isAnyModalOpen (local state)
  ├─ setIsAnyModalOpen (local state)
  ├─ notes (from WebSocketContext)
  └─ selectedUserId (from local state)
      ↓
Board
  ├─ receives all above props
  ├─ adds: hoveredColumn, draggingItemIdRef
  └─ passes down to children
      ↓
BoardColumn (×4 columns)
  ├─ receives: isFocus, currentUser, isAnyModalOpen, etc.
  ├─ adds: 9 more useState hooks
  └─ passes some to children
      ↓
BoardItemCard (×N notes per column)
  ├─ receives: drag handlers
  ├─ reads useFocusStateStore AGAIN (redundant!)
  ├─ reads useWebSocketContext
  └─ manages 3 modals locally
```

### Modal State (Duplicated Pattern)

**Pattern repeated 12+ times across components:**
```typescript
const [isSubmitting, setIsSubmitting] = useState(false)

useEffect(() => {
  if (isSubmitting && !isLoading) {
    onClose()
  }
}, [isSubmitting, isLoading, onClose])

const handleSubmit = () => {
  sendMessageAsync(message, "Success!")
  setIsSubmitting(true)
}
```

**Modal States Scattered:**
- BoardScreen: `isEndStatusModalOpen`, `isAddNewNoteModalOpen`, `isAddUserMarkModalOpen`
- BoardColumn: `isAddNewNoteModalOpen`, `isDeleteNoteBulkModalOpen`
- BoardItemCard: `editModal.isOpen`, `deleteModal.isOpen`, `splitModal.isOpen`

❌ **All should be centralized in Zustand modalSlice**

## Problems Identified

### High Priority

1. **users/notes in Context instead of Zustand**
   - Can't use Zustand DevTools to inspect board data
   - Context causes cascading re-renders
   - Difficult to test state logic independently
   - Files affected: WebSocketProvider.tsx, BoardScreen.tsx, Board.tsx, BoardColumn.tsx, BoardItemCard.tsx

2. **Excessive prop drilling (4 levels deep)**
   - BoardScreen → Board → BoardColumn → BoardItemCard
   - Props: `isFocus`, `currentUser`, `isAnyModalOpen`, `setIsAnyModalOpen`, `selectedUserId`
   - Makes refactoring difficult
   - Increases re-render scope

3. **Modal state duplication**
   - 12+ modals manage state locally
   - `isSubmitting` pattern repeated 98 times
   - No centralized modal management
   - Hard to track which modal is open

4. **Mixed state patterns**
   - Zustand for theme/focus/actions
   - Context for users/notes/connection
   - Local state for modals
   - No React Query for mutations
   - Inconsistent, confusing

### Medium Priority

5. **Performance issues**
   - Visual blinks during drag operations (reported in plan)
   - Likely due to cascading re-renders from Context updates
   - No memoization (React.memo, useCallback)
   - Zustand selectors could be more specific

6. **Redundant state reads**
   - BoardItemCard reads `useFocusStateStore()` even though props already have `isFocus`, `currentUser`
   - Both patterns exist simultaneously

### Low Priority

7. **No React Query usage**
   - Mutations use raw `sendMessageAsync()`
   - No standardized error handling
   - Loading states managed manually

## Recommendations

### Phase 1A.2: Unified Store Structure
```typescript
// web/src/store/index.ts
export const useAppStore = create<AppState>()(
  devtools(
    immer((set) => ({
      // boardSlice - FROM WebSocketProvider
      board: {
        users: [],
        notes: [],
        isLoading: false,
        setUsers: (users) => set((state) => { state.board.users = users }),
        setNotes: (notes) => set((state) => { state.board.notes = notes }),
        updateNote: (noteId, updates) => { /* ... */ },
        // ... other actions
      },

      // modalSlice - FROM scattered useState
      modals: {
        addNewNote: { isOpen: false, defaultValues: null },
        editNote: { isOpen: false, noteId: null },
        deleteNote: { isOpen: false, noteId: null },
        // ... all 12+ modals
        openModal: (modalName, data) => { /* ... */ },
        closeModal: (modalName) => { /* ... */ },
      },

      // focusSlice - MERGE useFocusStateStore
      focus: {
        isFocus: false,
        currentUser: "",
        setIsFocus: (focus) => { /* ... */ },
        setCurrentUser: (user) => { /* ... */ },
      },

      // themeSlice - MERGE useThemeStore
      theme: {
        mode: "light",
        setMode: (mode) => { /* ... */ },
        initializeTheme: () => { /* ... */ },
      },

      // actionSlice - MERGE useActionStateStore
      actions: {
        visibleAction: null,
        asyncQueue: [],
        startAsync: (id, message) => { /* ... */ },
        finishAsync: (id) => { /* ... */ },
        fire: (message) => { /* ... */ },
        close: () => { /* ... */ },
      },

      // uiSlice - NEW (drag state, menus, etc.)
      ui: {
        draggingItemId: null,
        hoveredColumn: null,
        setDraggingItemId: (id) => { /* ... */ },
        setHoveredColumn: (col) => { /* ... */ },
      }
    }))
  )
)
```

### Phase 1A.3: WebSocketProvider Refactor
```typescript
// Keep ONLY connection-related state
interface WebSocketContextType {
  sendMessage: (message: string) => void
  sendMessageAsync: (message: string, successNotification: string) => void
  connectionStatus: string
  isLoading: boolean
}

// Message handlers update Zustand:
const handlePatchMessage = (msg) => {
  msg.ops.forEach((op) => {
    switch (op.type) {
      case "UserAdded":
        useAppStore.getState().board.addUser(transformUser(op.user))
        break
      case "NoteTextUpdated":
        useAppStore.getState().board.updateNote(op.id, { text: op.text })
        break
      // ...
    }
  })
}
```

### Phase 1A.4: Component Usage (No Prop Drilling)
```typescript
// BoardScreen.tsx - NO props to Board
function BoardScreen() {
  const notes = useAppStore(state => state.board.notes)

  return <Board />  // No props!
}

// Board.tsx - reads from store
function Board() {
  const notes = useAppStore(state => state.board.notes)
  const isFocus = useAppStore(state => state.focus.isFocus)

  return columns.map(col =>
    <BoardColumn key={col.state} state={col.state} items={col.items} />
  )
}

// BoardColumn.tsx - reads from store
function BoardColumn({ state, items }) {
  const openAddNoteModal = useAppStore(state => state.modals.openModal)
  const isFocus = useAppStore(state => state.focus.isFocus)

  // No props from parent!
}

// BoardItemCard.tsx - reads from store
function BoardItemCard({ note }) {
  const isFocus = useAppStore(state => state.focus.isFocus)
  const openEditModal = useAppStore(state => state.modals.openModal)

  // No props from parent!
}
```

## Files to Modify (Phase 1A)

### Phase 1A.1 ✓ COMPLETE
- [x] `docs/state-audit.md` (this file)

### Phase 1A.2 - Store Structure
- [ ] Create `web/src/store/` directory
- [ ] Create `web/src/store/slices/boardSlice.ts`
- [ ] Create `web/src/store/slices/modalSlice.ts`
- [ ] Create `web/src/store/slices/focusSlice.ts`
- [ ] Create `web/src/store/slices/themeSlice.ts`
- [ ] Create `web/src/store/slices/actionSlice.ts`
- [ ] Create `web/src/store/slices/uiSlice.ts`
- [ ] Create `web/src/store/index.ts` (unified export)

### Phase 1A.3 - Move users/notes to Zustand
- [ ] Implement `boardSlice.ts` with users/notes state
- [ ] Refactor `web/src/context/WebSocketProvider.tsx`:
  - Remove `users`, `notes` state
  - Update message handlers to call Zustand actions
  - Keep only connection-related state in Context
- [ ] Update components to read from Zustand:
  - `web/src/screens/BoardScreen.tsx`
  - `web/src/components/Board.tsx`
  - `web/src/components/BoardColumn.tsx`
  - `web/src/components/BoardItemCard.tsx`
  - All modal components

### Phase 1A.4 - Modal State Migration
- [ ] Implement `modalSlice.ts`
- [ ] Update `web/src/screens/BoardScreen.tsx` - remove modal useState
- [ ] Update `web/src/components/BoardColumn.tsx` - remove modal useState
- [ ] Update `web/src/components/BoardItemCard.tsx` - remove modal useState
- [ ] Remove `isAnyModalOpen` prop from Board hierarchy

### Phase 1A.5 - Consolidate Stores
- [ ] Copy `useThemeStore` logic to `themeSlice.ts`
- [ ] Copy `useFocusStateStore` logic to `focusSlice.ts`
- [ ] Copy `useActionStateStore` logic to `actionSlice.ts`
- [ ] Update all imports across codebase
- [ ] Delete `web/src/utils/store.ts`

### Phase 1A.6 - Remove Focus Prop Drilling
- [ ] Remove `isFocus`, `currentUser` props from BoardScreen → Board
- [ ] Remove from Board → BoardColumn
- [ ] Remove from BoardColumn → BoardItemCard
- [ ] Components read directly from `useAppStore(state => state.focus)`

### Phase 1A.7 - React Query
- [ ] Audit all mutations
- [ ] Convert to `useMutation`
- [ ] Standardize error/loading handling

### Phase 1A.8 - Final Cleanup
- [ ] Verify no state props in Board hierarchy
- [ ] Test all functionality
- [ ] Run linter
- [ ] Commit

## Summary Statistics

**Current Zustand Stores:** 3 separate stores
**Target:** 1 unified store with 6 slices

**Props Drilled (BoardScreen → Board → BoardColumn → BoardItemCard):**
- `isFocus` (3 levels)
- `currentUser` (3 levels)
- `isAnyModalOpen` (3 levels)
- `setIsAnyModalOpen` (3 levels)
- `notes` (from Context, 2 levels)
- `selectedUserId` (3 levels)

**Total:** 6 props × multiple levels = **Significant prop drilling**

**Modal States:**
- BoardScreen: 3 modals
- BoardColumn: 2 modals
- BoardItemCard: 3 modals
- **Total:** 8 modal states in components (+ 4+ more in other files)

**useState Hooks in Board Hierarchy:**
- BoardScreen: ~6 hooks (via custom hooks)
- Board: 2 hooks
- BoardColumn: 9 hooks
- BoardItemCard: 8 hooks
- **Total:** ~25 local state hooks

**Target:** 0 props, 0 modal useState (all in Zustand)

---

**Next Step:** Phase 1A.2 - Design and implement unified Zustand store structure
