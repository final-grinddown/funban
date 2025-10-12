# Contract Validation System

This directory contains the WebSocket contract validation system that ensures type safety between the Rust backend and TypeScript frontend.

## 🎯 Purpose

Prevents breaking changes to WebSocket communication by validating that:
- Backend generates valid contract examples
- Frontend schemas match backend message structure  
- All message variants are properly typed and tested

## 📁 Structure

```
contracts/
├── ws_actions.json        # Frontend → Backend messages (generated & committed)
├── ws_operations.json     # Backend → Frontend messages (generated & committed)
└── README.md             # This file
```

## 🔄 Workflow

### 1. **Server Build** (generates contracts)
```bash
cd server && cargo build
```
- Rust code automatically generates JSON contract examples
- Contracts saved to `/contracts/` (committed to git like OpenAPI specs)
- **Regenerate & commit** when WebSocket message types change

### 2. **Contract Sync** (copies to frontend)
```bash
cd web && yarn contracts:sync
```
- Copies contracts from `/contracts/` to `web/src/contracts/`
- Auto-runs before dev/build/test via package.json scripts

### 3. **Validation** (tests schemas)
```bash
cd web && yarn test src/__tests__/contracts/
```
- Tests all 56+ contract variants against Zod schemas
- Validates type safety, required fields, enums
- Catches frontend/backend mismatches

## 🚨 CI/CD Integration

### Contract Validation Workflow
- **Triggers**: Server code changes or schema updates
- **Actions**: Builds server → Syncs contracts → Validates schemas
- **Result**: **BLOCKS PRs** if contracts don't match schemas

### When It Runs
The validation workflow runs on:
- Server Rust file changes (`server/**/*.rs`)
- Schema changes (`web/src/schemas/**`)  
- Contract changes (`contracts/**`)

### If Validation Fails
❌ **PR is blocked** until you fix:
1. **Schema mismatch**: Update `web/src/schemas/websocket.ts`
2. **Missing fields**: Add new fields to schemas
3. **Type conflicts**: Fix enum/type definitions
4. **Breaking changes**: Update WebSocket message handling

## 🛠️ Local Development

### Test the Full Flow
```bash
# 1. Generate fresh contracts
cd server && cargo build

# 2. Sync to frontend  
cd web && yarn contracts:sync

# 3. Run validation
yarn test src/__tests__/contracts/

# 4. Check TypeScript types
yarn check:ts
```

### Manual Sync (if needed)
```bash
cd web && yarn contracts:sync
```

## 📋 Contract Types

### Actions (Frontend → Backend)
- `AddNote`, `UpdateNoteText`, `UpdateNoteTag`
- `AddUser`, `UpdateUserName`, `UpdateUserColor`
- `Reorder`, `DeleteNotes`, `SplitNote`

### Operations (Backend → Frontend)  
- `NoteAdded`, `NoteTextUpdated`, `NoteOrderChanged`
- `UserAdded`, `UserNameUpdated`, `UserColorUpdated`
- `ActionFinished`, `SnapshotCreated`, `Error`

## 🚀 Benefits

✅ **Prevents runtime errors** from malformed WebSocket messages
✅ **Catches breaking changes** before deployment
✅ **Ensures type safety** across the full stack
✅ **Documents the API** with living examples
✅ **Fast feedback** during development
✅ **Committed like OpenAPI specs** - always available, no CI dependencies

## 🔧 Schema Files

- **`web/src/schemas/websocket.ts`** - Zod schema definitions
- **`web/src/__tests__/contracts/`** - Validation test suites
- **`web/src/context/WebSocketProvider.tsx`** - Runtime validation

## 🆘 Troubleshooting

### "Contract sync failed"
```bash
# Check if contracts exist
ls -la contracts/*.json
# If missing, build server first
cd server && cargo build
```

### "Schema validation failed"  
- Check test output for specific field mismatches
- Update schemas in `web/src/schemas/websocket.ts`
- Verify enum values match between backend and frontend

### "TypeScript validation failed"
- Schema types don't match usage in WebSocketProvider
- Update type assertions or add proper transformation
- Check that new fields are handled in switch statements