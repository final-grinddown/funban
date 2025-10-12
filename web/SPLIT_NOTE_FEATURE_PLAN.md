# Split Note Feature Implementation Plan

## Feature Overview

A "Split Note" feature that allows users to divide a single note into two separate notes. This addresses the common scenario where a note contains a list of tasks and the user wants to change the status of only one item, without introducing the complexity of subtasks.

**User Flow:**
1. User clicks "Split Note" action on an existing note
2. Modal opens showing the original note content side-by-side with a new note
3. User can edit both note texts and set state/owner for the new note
4. User clicks "Split" to create the new note and update the original
5. Both notes exist independently after the operation

## Implementation Approach Analysis

### Frontend Approach (2 API calls)
**Pros:**
- ✅ **Simpler**: Uses existing `UpdateNote` + `AddNote` endpoints
- ✅ **No backend changes**: Faster to implement and deploy
- ✅ **Familiar patterns**: Reuses existing WebSocket message types

**Cons:**
- ❌ **Not atomic**: If one operation fails, you could end up in inconsistent state
- ❌ **More complex error handling**: Need to handle partial failures
- ❌ **Unclear semantics**: Two separate operations for one user intent

### Backend Approach (new `SplitNote` command) - RECOMMENDED
**Pros:**
- ✅ **Atomic operation**: Either both notes are created/updated or neither
- ✅ **Cleaner semantics**: Single action represents the user's intent
- ✅ **Better error handling**: Single point of failure
- ✅ **Audit trail**: Shows up as one "split" operation in history
- ✅ **Data integrity**: Prevents inconsistent states
- ✅ **Extensibility**: Easier to add features like "merge notes" later

**Cons:**
- ❌ **More backend work**: New endpoint, WebSocket message type, database logic

## Recommended Implementation Plan

### Phase 1: Backend API Design

**New WebSocket Message Type:**
```rust
struct ISplitNote {
    type: "SplitNote",
    original_id: number,
    original_text: string,
    new_text: string,
    new_state?: string,  // optional, defaults to same as original
    new_owner?: number,  // optional, defaults to same as original
}
```

**Backend Logic:**
1. Validate original note exists and user has permission
2. Start database transaction
3. Update original note with `original_text`
4. Create new note with `new_text`, `new_state` (or original state), `new_owner` (or original owner)
5. Set appropriate predecessor/successor relationships for note ordering
6. Commit transaction
7. Broadcast both updates to all connected clients

**Database Considerations:**
- Maintain note ordering (predecessor/successor chains)
- Preserve timestamps appropriately (original note keeps created_at, gets new updated_at)
- New note gets fresh created_at and updated_at

### Phase 2: Frontend Modal Component

**SplitNoteModal Component Structure:**
```typescript
interface SplitNoteModalProps {
  isOpen: boolean
  originalNote: INote
  onClose: () => void
}

interface FormInputs {
  originalText: string
  newText: string
  newState: string
  newOwner: string
}
```

**Modal Layout:**
- Two-column layout with original note on left, new note on right
- Text areas for both notes (pre-populated with original content)
- State selector for new note (defaults to original state)
- Owner selector for new note (defaults to original owner)
- "Split Note" button that sends single WebSocket message
- Cancel button

**Validation:**
- Both text fields required and within length limits
- At least one text field must be different from original
- Valid state and owner selections

### Phase 3: Integration & Testing

**WebSocket Integration:**
```typescript
// In websocket.ts
export function createSplitNote(
  originalId: string,
  originalText: string,
  newText: string,
  newState?: string,
  newOwner?: string
): string {
  const action: ISplitNote = {
    type: "SplitNote",
    original_id: parseInt(originalId),
    original_text: originalText,
    new_text: newText,
    new_state: newState,
    new_owner: newOwner ? parseInt(newOwner) : undefined,
  }
  return JSON.stringify(action)
}
```

**Testing Strategy:**
Following established modal testing patterns:
- Basic rendering & modal behavior (4 tests)
- Form pre-population & validation (5 tests) 
- Form field interactions (4 tests)
- Form submission scenarios (4 tests)
- Edge cases & error handling (3 tests)
- **Total: ~20 tests**

## Implementation Order

1. **Backend Implementation**
   - Add `ISplitNote` interface to shared types
   - Implement WebSocket message handler
   - Add database logic with transaction support
   - Test backend functionality

2. **Frontend Modal**
   - Create `SplitNoteModal` component
   - Implement form handling with react-hook-form
   - Add WebSocket integration
   - Style with Material-UI components

3. **Integration Points**
   - Add split action to note context menu/actions
   - Update `useBoardModalManagement` hook
   - Connect to existing modal orchestration

4. **Testing**
   - Unit tests for SplitNoteModal component
   - Integration tests for WebSocket flow
   - E2E testing of complete user workflow

## Technical Considerations

**State Management:**
- Modal state managed by existing `useBoardModalManagement` hook
- Form state handled by react-hook-form
- WebSocket loading states handled consistently with other modals

**Accessibility:**
- Proper ARIA labels for dual text areas
- Keyboard navigation between form fields
- Screen reader friendly layout with clear labels

**Performance:**
- Text areas should handle reasonable note lengths efficiently
- Form validation should be responsive but not overly aggressive
- WebSocket message should be appropriately sized

**Error Handling:**
- Backend validation errors displayed clearly
- Network failures handled gracefully
- Partial state recovery if needed

## Success Criteria

- ✅ User can split any existing note into two separate notes
- ✅ Both notes can be independently edited during split
- ✅ New note inherits appropriate defaults (state, owner) but can be customized
- ✅ Operation is atomic (both succeed or both fail)
- ✅ Note ordering is preserved correctly
- ✅ All clients receive real-time updates
- ✅ Feature integrates seamlessly with existing UI patterns
- ✅ Comprehensive test coverage following established patterns

## Future Enhancements

- **Quick Split**: Preset split points for common patterns (checkbox lists, numbered items)
- **Merge Notes**: Inverse operation to combine two notes
- **Split with Template**: Pre-defined formats for new note
- **Bulk Split**: Split multiple notes at once
- **Smart Text Parsing**: Automatically suggest split points based on content structure

---

**Status**: Planning phase complete, ready for implementation
**Next Step**: Choose implementation starting point (backend vs frontend first)
**Estimated Effort**: 
- Backend: 1-2 days
- Frontend: 1-2 days  
- Testing: 1 day
- **Total: 3-5 days**