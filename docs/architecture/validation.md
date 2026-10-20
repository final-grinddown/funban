# Runtime Validation Architecture

**Last Updated:** 2025-11-13
**Status:** Active (with archived dependency - see details below)

## Overview

Funban uses **Typia** for runtime validation of WebSocket messages. This provides compile-time type safety combined with runtime validation, ensuring that data from the Rust backend matches our TypeScript contracts.

## Architecture

```
┌─────────────────┐
│  Rust Backend   │
│                 │
│  Generates TS   │
│  contracts via  │
│  ts-rs crate    │
└────────┬────────┘
         │
         │ contracts/
         │ ├─ Note.ts
         │ ├─ User.ts
         │ └─ ...
         ▼
┌─────────────────┐
│   TypeScript    │
│   Contracts     │ ◄─── Single Source of Truth
│                 │
│  export type    │
│  Note = { ... } │
└────────┬────────┘
         │
         │ Import
         ▼
┌─────────────────┐
│  Typia Runtime  │
│   Validation    │
│                 │
│  typia.assert   │
│  <Type>(data)   │
└─────────────────┘
```

### Key Benefits

1. **Single Source of Truth**: Backend types automatically flow to frontend validation
2. **Zero Schema Duplication**: No need to maintain separate validation schemas
3. **Compile-time + Runtime Safety**: Types are validated at both compile and runtime
4. **No Schema Drift**: Backend changes automatically propagate to validation

## Implementation

### Validation Locations

We use Typia validation in **2 critical locations**:

1. **WebSocket Message Parsing** (`web/src/context/WebSocketProvider.tsx:223`)
   ```typescript
   const msg = typia.assert<WebSocketMessage>(rawMessage)
   ```

2. **WebSocket Action Validation** (`web/src/app/api/websocket.ts:7`)
   ```typescript
   typia.assert<WsAction>(action)
   ```

### Dependencies

- **typia**: `9.7.2` (pinned) - Active library maintained by samchon
- **@ryoppippi/unplugin-typia**: `2.6.5` (pinned) - **ARCHIVED** but functional

## Dependency Status: unplugin-typia Archived

### Current Situation

The `@ryoppippi/unplugin-typia` package was **archived on June 14, 2025** by its maintainer.

**Reasons for archival:**
- TypeScript's migration to `tsgo` (Go-based compiler) creates uncertainty
- New compiler uses IPC-based APIs instead of direct compiler internals
- Maintainer shifted focus to other projects

### Why We're Keeping It

**Decision: Continue using current setup** ✅

**Rationale:**
1. **Archived ≠ Broken** - Package still works perfectly
2. **Superior Architecture** - Single source of truth is architecturally valuable
3. **Minimal Risk** - Only 2 validation points in entire codebase
4. **Feature Complete** - No updates needed for our use case
5. **No Better Alternative** - Alternatives require schema duplication

### Security Posture

- ✅ **Versions pinned** to prevent unexpected updates
- ✅ **Security audit** runs quarterly
- ✅ **No known vulnerabilities** (as of 2025-11-13)
- ✅ **Monitoring enabled** via Dependabot

### Migration Contingency

If migration becomes necessary (security issue, compatibility break), we have documented options:

1. **Option 1: Fork unplugin-typia** (1-2 days effort)
   - Maintain minimal fork with security patches
   - Publish to private registry

2. **Option 2: Migrate to Zod** (3-5 days effort)
   - Create Zod schemas mirroring backend contracts
   - Higher ongoing maintenance (schema drift risk)
   - Last resort only

See `REFACTORING_PLAN.md` Phase 6 for complete migration strategy.

## Monitoring & Maintenance

### Quarterly Reviews

Every 3 months:
- ✅ Run `yarn npm audit` for security vulnerabilities
- ✅ Check Typia ecosystem for community forks
- ✅ Monitor official Typia repo for Next.js support updates
- ✅ Review this document and update if needed

### Before Major Upgrades

Before upgrading Next.js, TypeScript, or Node:
- ✅ Test compatibility with current Typia setup
- ✅ Check for breaking changes
- ✅ Have rollback plan ready

### Triggers for Migration

Migrate immediately if:
- ❌ Critical security vulnerability found
- ❌ Incompatibility with Next.js/TypeScript updates
- ❌ Business requirement for officially supported stack

## Alternative Approaches Considered

### Zod (Rejected for now)

**Pros:**
- Actively maintained, stable ecosystem
- Works seamlessly with Next.js
- Excellent TypeScript inference

**Cons:**
- ❌ **Requires duplicating every type as Zod schema**
- ❌ **Schema drift risk** (schemas can diverge from backend)
- ❌ **Higher maintenance burden**
- ❌ **Loses single source of truth architecture**

### Valibot (Rejected for now)

**Pros:**
- Smaller bundle size than Zod
- Modular, tree-shakeable

**Cons:**
- ❌ Same schema duplication issues as Zod
- ❌ Less mature ecosystem

### No Runtime Validation (Rejected)

**Cons:**
- ❌ Risk of crashes from malformed WebSocket data
- ❌ No protection against backend contract changes
- ❌ Debugging becomes much harder

## References

- [Typia Official Docs](https://typia.io/)
- [unplugin-typia GitHub](https://github.com/ryoppippi/unplugin-typia) (archived)
- [REFACTORING_PLAN.md Phase 6](../../REFACTORING_PLAN.md#phase-6-typia-migration--cleanup)
- [Security Advisory: unplugin-typia archived](https://github.com/ryoppippi/unplugin-typia/issues/860)

## Questions?

For questions about this architecture, see:
- Technical decisions: `REFACTORING_PLAN.md` Phase 6
- Implementation: Check the 2 validation locations listed above
- Migration planning: Contact tech lead

---

**Note:** This is a living document. Update it when:
- Dependency status changes
- New alternatives emerge
- Migration decisions are made
- Security posture changes
