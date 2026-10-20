# Performance Baseline - Phase 1C

**Date:** 2025-11-13
**Status:** Pre-optimization baseline

## Current Architecture (Post Phase 1A & 1B)

### Component Structure

```
Board (123 lines)
├── BoardColumn (227 lines)
│   ├── BoardColumnHeader (39 lines)
│   ├── BoardColumnList (68 lines)
│   └── BoardColumnMenu (66 lines)
└── BoardItemCard (249 lines)
    ├── NoteCardHeader (91 lines)
    ├── NoteCardTags (28 lines)
    └── NoteCardMenu (99 lines)
```

### State Management

- **Zustand Store**: Single unified store with 6 slices
- **Selectors**: Using basic selectors, no memoization yet
- **Props**: Minimal prop drilling (eliminated in Phase 1A)

## Performance Concerns

### Potential Re-render Issues

1. **BoardColumn Components**
   - Re-renders when any note in the board changes (not just own column)
   - Sub-components (Header, List, Menu) re-render with parent
   - Drag-and-drop triggers multiple re-renders

2. **BoardItemCard Components**
   - Re-renders when any note changes
   - Sub-components always re-render with parent
   - Context menu state causes full card re-render

3. **Event Handlers**
   - Created inline or without useCallback
   - New function references on every render
   - Prevents memoization from working effectively

4. **Zustand Selectors**
   - May return new object references on every call
   - No shallow equality checks
   - Could cause unnecessary re-renders

## Known Issues to Address

### Visual Blinks
- ⚠️ Noted in original audit: "Visual blinks when moving items"
- Likely caused by cascading re-renders during drag operations
- Target: Eliminate completely

### Drag Performance
- Large boards (50+ notes) may show performance degradation
- Every note re-renders during drag
- Can be improved with React.memo()

## Baseline Metrics (Manual Observation)

**Test Scenario:** Board with 20 notes across 4 columns

| Action | Expected Behavior | Current Behavior |
|--------|-------------------|------------------|
| Drag note | Only dragged note re-renders | Multiple notes re-render |
| Update note | Only updated note re-renders | Column re-renders |
| Open modal | Only modal renders | Parent components re-render |
| Focus change | Only affected notes re-render | All notes re-render |

## Optimization Goals

### Primary Goals
1. ✓ Add React.memo() to all sub-components
2. ✓ Wrap event handlers with useCallback
3. ✓ Optimize Zustand selectors
4. ✓ Eliminate visual blinks

### Success Criteria
- ✓ Dragging note causes < 5 component re-renders
- ✓ No visual blinks during drag operations
- ✓ Board with 50+ notes remains smooth
- ✓ Opening modal doesn't trigger board re-renders

## Testing Plan

### Manual Testing
1. Open React DevTools Profiler
2. Start recording
3. Perform drag operation
4. Check flame graph for unnecessary re-renders
5. Compare before/after metrics

### Automated Testing
- Ensure all 269 tests still pass
- No new console warnings
- Build size remains similar

## Next Steps

1. Add React.memo() to BoardColumn sub-components
2. Add React.memo() to BoardItemCard sub-components
3. Wrap event handlers with useCallback
4. Optimize Zustand selectors
5. Document improvements

---

**Note:** This is a baseline document. Actual profiling should be done with React DevTools in development mode with a representative board size.
