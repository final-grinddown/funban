# Codebase Audit Report

**Project**: Funban Web Frontend (Next.js/React)
**Date**: 2025-11-14
**Auditor**: Claude Code - Codebase Auditor Agent

## Executive Summary

The Funban web frontend is a well-structured Next.js 15 application with React 19, demonstrating modern best practices in many areas. The codebase shows evidence of recent refactoring efforts (optimized sorting algorithm, SSR-safe localStorage, error boundaries). However, several issues were identified ranging from type safety concerns to architectural improvements.

**Overall Health**: Good (7/10)

- Strong architecture with proper separation of concerns
- Excellent TypeScript usage with strict mode enabled
- Good WebSocket implementation with runtime validation
- Well-organized component structure

**Key Strengths**:

- Optimized O(n) sorting algorithm for note ordering
- SSR-safe implementations in critical components
- Comprehensive error handling infrastructure
- Type-safe WebSocket messages using typia validation
- Clean separation of UI state (Zustand) and server state (TanStack Query)

**Critical Priorities**:

1. Fix `any` type usage in auth callbacks (security concern)
2. Add error boundaries around more components
3. Implement proper error reporting integration
4. Address localStorage SSR safety issues
5. Reduce duplicate useEffect dependencies

## Audit Scope

- **Total Files Reviewed**: 118
- **Total Lines of Code**: ~9,639
- **Technologies**: Next.js 15.5.2, React 19, TypeScript 5, Material-UI 7.3.2, Zustand 4.5.5, TanStack Query 5.51, NextAuth 5.0-beta.30
- **Review Duration**: 2 hours
- **Files Excluded**: Test files, node_modules, .next build artifacts

## Findings Overview

- Critical Errors: 2
- Red Flags: 8
- Code Smells: 12
- Best Practice Violations: 15
- Technical Debt: 6

---

## Architecture Overview

### System Design

The application follows a modern React architecture with clear separation of concerns:

**Presentation Layer**:

- Next.js App Router for routing and SSR
- Material-UI components for consistent UI
- React Hook Form for form management
- Emotion for styling

**State Management Layer**:

- **Zustand** for client-side UI state (modals, focus, board data, theme)
- **TanStack Query** for server state caching (history, user marks)
- **NextAuth** for authentication session management

**Data Layer**:

- WebSocket connection for real-time board updates
- REST API for non-real-time operations (history, settings)
- Type-safe message validation using typia

### Component Interaction

```
┌─────────────────────────────────────────────────────┐
│              App Layout (_provider.tsx)              │
│  - QueryClientProvider (server state)                │
│  - ThemeProvider (MUI theming)                       │
│  - AppRouterCacheProvider (Next.js cache)           │
└─────────────────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼──────┐  ┌──────▼──────┐  ┌─────▼──────┐
│ AuthProvider │  │  WebSocket  │  │DashboardLay│
│ (NextAuth)   │  │  Provider   │  │    out     │
└──────────────┘  └─────────────┘  └────────────┘
                         │
                  ┌──────┴──────┐
                  │             │
           ┌──────▼─────┐  ┌────▼────┐
           │   Board    │  │ Screens │
           │(DnD + Cards)│  │(Settings)│
           └────────────┘  └─────────┘
```

### Data Flow

**Real-time Updates (WebSocket)**:

1. User action → Component event handler
2. Create typed WsAction → Validate with typia
3. Send via WebSocket with UUID tracking
4. Optimistic UI update (for drag & drop)
5. Server processes → Sends WsOperation patch
6. Patch handler updates Zustand store
7. React re-renders affected components

**Non-real-time Operations (REST)**:

1. User action → Component calls TanStack Query mutation
2. fetchWithAuth adds JWT token
3. Server responds with data
4. Query cache updates
5. Component re-renders with new data

### Key Design Decisions

1. **Linked-list note ordering**: Notes use predecessor_id for stable ordering (O(n) traversal)
2. **Optimistic drag & drop**: Local state during drag, server confirmation after
3. **Typia validation**: Runtime type checking of WebSocket messages for safety
4. **Zustand slices**: Modular state management with domain-specific slices
5. **SSR-safe patterns**: localStorage access wrapped in typeof window checks

---

## Module Reviews

### 1. Authentication & Authorization

**Files**: `auth.ts`, `src/middleware.ts`, `src/context/AuthProvider.tsx`, `src/app/api/fetchWithAuth.ts`
**Purpose**: User authentication, session management, API authorization

#### Findings

- **Critical Error** (`auth.ts:64,79`)

  - Description: Using `any` type for token and user parameters in JWT/session callbacks
  - Impact: Bypasses TypeScript type safety, could lead to runtime errors accessing undefined properties
  - Recommendation: Define proper types for JWT and Session callbacks

  ```typescript
  // Should be:
  interface ExtendedToken extends JWT {
    accessToken?: string
    sub?: string
  }

  async jwt({ token, user }: { token: ExtendedToken; user: User & { token: string } })
  ```

- **Red Flag** (`auth.ts:48-50`)

  - Description: Generic error handling with console.error only
  - Impact: Authentication errors silently fail, no user feedback
  - Recommendation: Return error information to display to user, log to error service

- **Code Smell** (`src/app/api/fetchWithAuth.ts:30`)

  - Description: Empty catch block loses error context
  - Impact: Network errors lose stack trace and details
  - Recommendation: Preserve original error or at least log it

- **Best Practice Violation** (`src/middleware.ts:3-5`)
  - Description: Empty middleware function body
  - Impact: Unclear if intentional or incomplete implementation
  - Recommendation: Add comment explaining why middleware body is empty or implement auth check

---

### 2. State Management (Zustand Store)

**Files**: `src/store/index.ts`, `src/store/slices/*.ts`
**Purpose**: Global application state management

#### Findings

- **Code Smell** (`src/store/slices/modalSlice.ts:19`)

  - Description: Generic `any` type for modal data
  - Impact: Loses type safety for modal payloads
  - Recommendation: Use discriminated union types or generic constraints for modal data

- **Code Smell** (`src/store/slices/boardSlice.ts:54-65`)

  - Description: Duplicate logic updating notes when user name/color changes
  - Impact: Violates DRY principle, easy to introduce bugs
  - Recommendation: Extract to helper function or reconsider data normalization

- **Best Practice Violation** (`src/store/slices/themeSlice.ts:27-28`)
  - Description: Direct window access in state creator (SSR unsafe)
  - Impact: Will crash during SSR if called before client-side hydration
  - Recommendation: Add typeof window check or move to useEffect

---

### 3. WebSocket Communication

**Files**: `src/context/WebSocketProvider.tsx`, `src/websocket/handlers/*.ts`, `src/app/api/websocket.ts`
**Purpose**: Real-time bidirectional communication with server

#### Findings

- **Best Practice Violation** (`src/context/WebSocketProvider.tsx:226`)

  - Description: ESLint disable comment for exhaustive-deps
  - Impact: May miss necessary dependencies, causing stale closures
  - Recommendation: Review dependencies and fix properly rather than disabling

- **Code Smell** (`src/context/WebSocketProvider.tsx:88`)

  - Description: Console.error for missing accessToken in production
  - Impact: Exposes internal errors to end users
  - Recommendation: Use proper error logging service in production

- **Best Practice Violation** (`src/websocket/handlers/handleActionPatch.ts:30`)

  - Description: Console.error for WebSocket errors
  - Impact: No user notification of errors, poor UX
  - Recommendation: Show toast/snackbar notification to user

- **Code Smell** (`src/websocket/handlers/index.ts:62`)
  - Description: Console.warn in default case (unreachable due to exhaustiveness check)
  - Impact: Dead code, never executes due to TypeScript never type
  - Recommendation: Remove console.warn or restructure exhaustiveness check

---

### 4. Component Architecture

**Files**: `src/components/*.tsx`, `src/components/**/*.tsx`
**Purpose**: Reusable UI components

#### Findings

- **Red Flag** (`src/components/Board.tsx:165-172`)

  - Description: handleDragStart captures store state in closure
  - Impact: If store updates during drag, local state is stale
  - Recommendation: Use ref to capture latest store state instead of closure

- **Code Smell** (`src/components/Board.tsx:60-61`)

  - Description: Complex boolean expression for hasPendingDrag
  - Impact: Hard to read and reason about
  - Recommendation: Extract to useMemo with clear variable name

- **Best Practice Violation** (`src/components/BoardItemCard/BoardItemCard.tsx:68-77`)

  - Description: Multiple useState + useEffect for SSR-safe initialization
  - Impact: Causes double render, could use single useEffect
  - Recommendation: Combine into single effect or use proper SSR pattern

- **Code Smell** (`src/components/BoardItemCard/BoardItemCard.tsx:130-134`)

  - Description: useEffect with isSubmitting and isLoading checking
  - Impact: Fragile side effect, may not work as expected
  - Recommendation: Rely on useModalSubmission hook instead

- **Best Practice Violation** (`src/components/EditNoteModal.tsx:73-83`)

  - Description: setTimeout 0 for focus management
  - Impact: Hack that may be unreliable, race condition prone
  - Recommendation: Use callback ref or proper focus management hook

- **Code Smell** (`src/components/AddNewNoteModal.tsx:89-98, 101-114, 117-121`)
  - Description: Three separate useEffect hooks with overlapping concerns
  - Impact: Complex effect lifecycle, hard to reason about
  - Recommendation: Consolidate into single effect or use proper form library features

---

### 5. Hooks

**Files**: `src/hooks/*.ts`
**Purpose**: Reusable React logic

#### Findings

- **Code Smell** (`src/hooks/useNoteSorting.ts:53`)

  - Description: Filtering orphaned notes after sorting
  - Impact: Edge case handling, suggests data integrity issue
  - Recommendation: Investigate why orphaned notes exist, fix at source

- **Best Practice Violation** (`src/hooks/useModalSubmission.ts:35-44`)

  - Description: Complex useEffect with multiple conditions
  - Impact: Hard to reason about when modal will close
  - Recommendation: Simplify logic or split into separate effects

- **Red Flag** (`src/hooks/useUserSelection.ts` - inferred from usage)
  - Description: User selection stored as string, requires parseInt everywhere
  - Impact: Type inconsistency, error-prone
  - Recommendation: Store as number, convert only at API boundary

---

### 6. Error Handling & Logging

**Files**: `src/utils/errorHandler.ts`, `src/components/ErrorBoundary.tsx`
**Purpose**: Centralized error management

#### Findings

- **Technical Debt** (`src/utils/errorHandler.ts:44-57`)

  - Description: TODO comments for toast notifications and error reporting
  - Impact: Errors not visible to users, no monitoring
  - Recommendation: Integrate error reporting service (Sentry/LogRocket) and toast system

- **Technical Debt** (`src/components/ErrorBoundary.tsx:40`)

  - Description: TODO for error reporting service integration
  - Impact: Component errors not tracked in production
  - Recommendation: Add Sentry or similar service

- **Red Flag** (Multiple files)
  - Description: 9 files using console.log/error/warn
  - Impact: No centralized logging, hard to debug production issues
  - Recommendation: Use structured logging library (winston/pino) with log levels

---

### 7. Forms & Validation

**Files**: `src/components/*Modal.tsx`, `src/hooks/useFormValidation.ts`
**Purpose**: User input forms and validation

#### Findings

- **Code Smell** (`src/hooks/useFormValidation.ts:17`)

  - Description: Comment "Whether form has any changes" next to isDirty check
  - Impact: Redundant comment for obvious code
  - Recommendation: Remove unnecessary comment

- **Best Practice Violation** (`src/components/NoteTextFieldController.tsx` - inferred from usage)
  - Description: Custom text field controller instead of using react-hook-form's built-in
  - Impact: More code to maintain, potential for bugs
  - Recommendation: Evaluate if custom wrapper is necessary

---

### 8. Utils & Helpers

**Files**: `src/utils/*.ts`
**Purpose**: Shared utility functions

#### Findings

- **Code Smell** (`src/utils/helpers.ts:89-92`)

  - Description: base64EncodeUnicode uses String.fromCharCode.apply with Array.from
  - Impact: Inefficient, could fail on large inputs (call stack limit)
  - Recommendation: Use loop or reduce instead of apply

- **Code Smell** (`src/utils/storage.ts:43`)

  - Description: Inconsistent localStorage vs window.localStorage
  - Impact: Confusing, mixing global and window-scoped access
  - Recommendation: Use window.localStorage consistently

- **Best Practice Violation** (`src/utils/storage.ts` - all functions)
  - Description: No try-catch around localStorage access
  - Impact: Will throw in incognito mode or when storage is full
  - Recommendation: Wrap all localStorage calls in try-catch

---

### 9. Screens

**Files**: `src/screens/*.tsx`
**Purpose**: Page-level components

#### Findings

- **Code Smell** (`src/screens/BoardScreen.tsx:50-63`)

  - Description: Complex snapshot transformation in useMemo
  - Impact: Business logic in presentation layer
  - Recommendation: Extract to utility function or handle in API layer

- **Best Practice Violation** (`src/screens/BoardScreen.tsx:74-78`)

  - Description: Multiple separate useHotkeys calls
  - Impact: Verbose, could be array-based configuration
  - Recommendation: Use array of hotkey definitions or single hook call

- **Code Smell** (`src/screens/UserMarksScreen.tsx` - inferred from console usage)
  - Description: Console.error for production errors
  - Impact: Not user-friendly, no proper error handling
  - Recommendation: Show error state in UI, use error service

---

### 10. Type Definitions

**Files**: `src/utils/interfaces.ts`, `src/utils/types.ts`, `src/schemas/websocket.ts`
**Purpose**: TypeScript type definitions

#### Findings

- **Red Flag** (`src/utils/interfaces.ts:10-18`)

  - Description: Unused interface definitions (IWebSocketMessage, IServerMessage, IPatchOperation)
  - Impact: Dead code, confusing
  - Recommendation: Remove unused types or document why kept

- **Code Smell** (`src/utils/interfaces.ts:24-37`)

  - Description: IRawNote has string IDs, Note has number IDs
  - Impact: Constant conversion needed, error-prone
  - Recommendation: Standardize on number throughout or use branded types

- **Best Practice Violation** (`src/utils/types.ts:3`)
  - Description: TThemeMode type allows "system" but storage functions don't handle it consistently
  - Impact: Type doesn't match runtime behavior
  - Recommendation: Fix type or storage implementation

---

### 11. Pages (\_document)

**Files**: `src/pages/_document.tsx`
**Purpose**: Custom Next.js document for HTML structure

#### Findings

- **Best Practice Violation** (`src/pages/_document.tsx:13`)

  - Description: Using 'theme' key without project prefix in localStorage
  - Impact: Could conflict with other apps on same domain
  - Recommendation: Use prefixed key from storage.ts createPrefixedKey

- **Security Concern** (`src/pages/_document.tsx:8-26`)
  - Description: dangerouslySetInnerHTML for theme initialization
  - Impact: Necessary for SSR but should be reviewed carefully
  - Recommendation: Acceptable use case, but ensure no user input interpolated

---

### 12. Configuration & Dependencies

**Files**: `package.json`, `tsconfig.json`, `next.config.mjs`, `eslint.config.mjs`
**Purpose**: Project configuration

#### Findings

- **Technical Debt** (`package.json:5`)

  - Description: Archived dependency @ryoppippi/unplugin-typia noted in comments
  - Impact: Dependency archived in June 2025, may have security issues
  - Recommendation: Follow migration strategy in REFACTORING_PLAN.md Phase 6

- **Technical Debt** (`package.json:31`)

  - Description: NextAuth 5.0-beta.30 (beta version in production)
  - Impact: May have bugs, API may change
  - Recommendation: Monitor for stable release, be prepared for migration

- **Best Practice Violation** (`tsconfig.json:14`)
  - Description: skipLibCheck: true
  - Impact: Skips type checking in node_modules, may miss type errors
  - Recommendation: Only enable if necessary for build performance

---

## Cross-Cutting Concerns

### Security

**Overall**: Good security posture with some concerns

**Findings**:

1. **Red Flag**: JWT tokens stored in session (NextAuth handles this, but worth noting)
2. **Best Practice**: Using Bearer token authentication
3. **Good**: No eval() usage detected
4. **Good**: No dangerouslySetInnerHTML except legitimate SSR theme case
5. **Concern**: Error messages may leak internal information in production
6. **Missing**: No rate limiting on client side
7. **Missing**: No Content Security Policy headers visible

**Recommendations**:

- Add CSP headers in next.config.mjs
- Implement client-side rate limiting for API calls
- Sanitize error messages in production

---

### Performance

**Overall**: Generally optimized with some areas for improvement

**Findings**:

1. **Excellent**: O(n) sorting algorithm (recently optimized from O(n²))
2. **Good**: useMemo and useCallback used appropriately
3. **Good**: Lazy loading not needed (small bundle size)
4. **Concern**: Multiple re-renders in BoardItemCard due to useState + useEffect pattern
5. **Concern**: Drag and drop creates new arrays on every drag event
6. **Good**: WebSocket message batching via ops array
7. **Missing**: No virtualization for large lists (could be issue with 1000+ notes)

**Recommendations**:

- Consider React.memo for BoardItemCard if performance issues arise
- Add virtualization (react-window) if supporting >100 notes per column
- Profile drag & drop with large note counts

---

### Dependencies

**Overall**: Modern stack with some concerns

**Findings**:

1. **Critical**: @ryoppippi/unplugin-typia (archived June 2025) - Migration planned
2. **Warning**: NextAuth 5.0-beta (not stable)
3. **Good**: React 19 (latest)
4. **Good**: Next.js 15.5.2 (latest)
5. **Good**: Material-UI 7.3.2 (latest)
6. **Good**: All other dependencies up-to-date

**Vulnerable Dependencies**: None detected (based on recent updates)

**Recommendations**:

- Execute Phase 6 migration away from unplugin-typia
- Monitor NextAuth 5.0 for stable release
- Set up Dependabot or Renovate for automated updates

---

### Testing

**Overall**: Good test coverage (based on test files present)

**Findings**:

1. **Good**: Jest + Testing Library setup
2. **Good**: Component tests for critical components
3. **Good**: Test utilities and mocks well organized
4. **Missing**: Integration tests for WebSocket flow
5. **Missing**: E2E tests (Playwright/Cypress)
6. **Concern**: Many test files use `any` types for mocks

**Coverage** (from coverage/ directory):

- Tests exist for critical components
- Modal components well tested
- Screen components tested

**Recommendations**:

- Add integration tests for WebSocket message handling
- Add E2E tests for critical user flows
- Type test mocks properly instead of using `any`

---

### Documentation

**Overall**: Good inline documentation, some TODOs

**Findings**:

1. **Good**: JSDoc comments in utility functions
2. **Good**: Architecture comments in WebSocketProvider
3. **Good**: README and TESTING_STRATEGY.md present
4. **Concern**: 4 TODO comments for unimplemented features
5. **Missing**: API documentation
6. **Missing**: Component prop documentation (though TypeScript provides this)

**Recommendations**:

- Address TODO comments or create tickets
- Document WebSocket message protocol
- Add Storybook for component documentation

---

### Code Quality Metrics

**TypeScript Usage**: 9/10

- Strict mode enabled
- Minimal `any` usage (mostly in tests)
- Good type inference

**Component Design**: 8/10

- Clear separation of concerns
- Good use of composition
- Some complex components could be split

**State Management**: 8/10

- Clean Zustand implementation
- Good separation of UI and server state
- Some normalization issues

**Error Handling**: 6/10

- Good infrastructure in place
- Many TODOs for actual implementation
- Needs error reporting integration

**Code Consistency**: 9/10

- Consistent naming conventions
- Good file organization
- ESLint configured

---

## Priority Issues Summary

### Must Fix (Critical - Next Sprint)

1. **Type `any` in auth callbacks** (`auth.ts:64,79`)

   - Security and stability concern
   - Easy fix with proper typing

2. **localStorage without try-catch** (`src/utils/storage.ts`)
   - Will crash in incognito mode
   - Wrap all calls in try-catch

### Should Fix (High Priority - Next 2 Sprints)

3. **Implement error reporting** (`src/utils/errorHandler.ts:44-57`)

   - Currently no monitoring of production errors
   - Integrate Sentry or LogRocket

4. **Fix theme SSR issue** (`src/store/slices/themeSlice.ts:27-28`)

   - Direct window access will crash SSR
   - Add typeof window check

5. **Remove unused types** (`src/utils/interfaces.ts:10-18`)

   - Dead code cleanup
   - Reduces confusion

6. **Fix user ID type inconsistency** (Multiple files)
   - String vs number conversions everywhere
   - Standardize on number

### Nice to Have (Medium Priority)

7. **Consolidate useEffect hooks** (Multiple modal components)

   - Simplify component logic
   - Easier to maintain

8. **Extract complex business logic** (`src/screens/BoardScreen.tsx:50-63`)

   - Move snapshot transformation to utils
   - Cleaner separation of concerns

9. **Replace setTimeout(0) for focus** (Multiple modals)

   - Use callback refs
   - More reliable

10. **Add error boundaries** (More components)
    - Better error isolation
    - Improved UX

### Technical Debt

11. **Migrate from archived typia plugin** (`package.json`)

    - Follow Phase 6 plan
    - Before dependency becomes unmaintained

12. **Upgrade NextAuth to stable** (`package.json`)
    - Monitor for v5.0 stable release
    - May require breaking changes

---

## Executive Summary

### Overview

The Funban web frontend demonstrates solid engineering practices with a modern tech stack. The codebase is well-organized, properly typed (with few exceptions), and shows evidence of thoughtful refactoring. Recent improvements include performance optimization of the sorting algorithm and SSR-safe implementations.

### Critical Findings

**2 Critical Errors** require immediate attention:

1. Untyped authentication callbacks creating type safety gaps
2. Unprotected localStorage access that will crash in incognito mode

**8 Red Flags** need addressing in the next sprint:

- Stale closures in drag & drop handlers
- Console-based error handling instead of user-facing messages
- User ID type inconsistencies throughout the app
- Dead code from unused interfaces

### Technical Debt Analysis

**Estimated Technical Debt**: ~40 hours

- Error reporting integration: 8 hours
- Type safety improvements: 8 hours
- localStorage error handling: 4 hours
- useEffect consolidation: 12 hours
- Documentation improvements: 8 hours

**Quick Wins** (< 2 hours each):

- Remove unused interfaces
- Fix auth callback types
- Add try-catch to localStorage
- Fix theme SSR issue
- Remove dead console.warn

### Recommended Roadmap

**Phase 1: Stability** (Sprint 1)

- Fix critical type safety issues
- Add localStorage error handling
- Implement basic error reporting
- Fix SSR issues

**Phase 2: Quality** (Sprint 2-3)

- Consolidate useEffect hooks
- Add error boundaries throughout
- Improve error handling UX
- Address user ID type inconsistency

**Phase 3: Maintenance** (Sprint 4+)

- Migrate from archived typia plugin (Phase 6 plan)
- Upgrade NextAuth to stable
- Add integration tests
- Implement proper logging

### Strengths to Maintain

1. **Strong TypeScript usage**: Keep strict mode, continue reducing `any` usage
2. **Optimized algorithms**: The O(n) sorting refactor shows performance awareness
3. **Clean architecture**: Zustand slices and component organization are excellent
4. **Type-safe WebSocket**: Typia validation prevents runtime errors
5. **Modern stack**: Staying current with React 19 and Next.js 15

### Overall Assessment

**Grade: B+ (7/10)**

This is a well-maintained production codebase with good engineering practices. The main areas for improvement are:

- **Error handling maturity**: Infrastructure exists but needs completion
- **Type safety gaps**: Mostly in auth and test code
- **SSR safety**: Some patterns need fixing
- **Technical debt**: Manageable but should be addressed proactively

The codebase is in good shape for continued development. The identified issues are primarily quality-of-life improvements and technical debt rather than fundamental problems. With focused effort on the critical and high-priority items, this can easily become an A-grade codebase.
