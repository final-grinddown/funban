# Bug Report: Note Dropped into Empty Column Jumps to TODO First Position

**Date:** 2026-05-06  
**Environment:** funban-staging  
**Versions:** server `1.2.9`, web `1.2.9`  
**Cluster:** microk8s, namespace `funban-staging`  
**URLs:** https://funban-dev.joseforge.cz / https://api.funban-dev.joseforge.cz  
**Reported by:** Pepa J. (josef.jura@hotmail.com)

---

## Summary

When a user drags a note into an **empty column**, the app shows a success notification but the note immediately jumps to the **TODO column at the first position** instead of landing in the target column. The move is silently rejected by the server. The root cause is a combination of a wrong drop-target encoding on the client for empty columns and a misleading optimistic success notification that is never retracted.

---

## Symptom

1. User drags a note over an empty column and releases.
2. A success notification appears.
3. The note visually snaps to the first position of the TODO column (before note ID `2194`).
4. The empty column remains empty.

---

## Timeline (2026-05-06, UTC)

| Time (UTC) | Event |
|---|---|
| 09:47:00 | Pod `funban-server-59fb49558c-fhnw9` starts, connects to DB |
| 09:47:11 | Client `Pepa J._937de40a` connects via WebSocket |
| **09:47:14** | **First buggy Reorder received: `moved_item_id: 2899, over_id: Before { id: 2194 }` → WARN → op_count:1** |
| **09:47:16** | **Same action retried (new UUID, same payload): same WARN → op_count:1** |
| 09:47:41 | Client `937de40a` disconnects, reconnects as `20560cb2` |
| 09:47:43 | `Reorder { moved_item_id: 2896, over_id: Before { id: 2899 } }` → SUCCESS (op_count:4) |
| 09:47:52 | Client reconnects as `8fe03447` |
| **09:47:56** | **Third attempt: same buggy payload for note 2899 → WARN → op_count:1** |
| 09:47:59 | `Reorder { moved_item_id: 2899, over_id: Before { id: 2870 } }` → SUCCESS (op_count:4) |
| 09:49:31 | Similar no-op for `moved_item_id: 2896, Before { id: 2870 }` → WARN → op_count:1 (separate issue or same user reproducing with different note) |

The user reconnected twice and tried the same empty-column drop, confirming reliable reproduction.

---

## Log Evidence

All buggy events follow this identical pattern:

```
INFO  Received action: Reorder { uuid: Some("..."), moved_item_id: 2899, over_id: Before { id: 2194 } }
WARN  Attempted to move note to its current position    [target: funban_server::sql::note]
INFO  Broadcasting operations, op_count: 1
```

Contrast with a **successful** reorder (non-empty column target):

```
INFO  Received action: Reorder { uuid: Some("..."), moved_item_id: 2899, over_id: Before { id: 2870 } }
INFO  Broadcasting operations, op_count: 4
```

The `op_count` difference is the key signal:
- `op_count: 4` = full reorder (update moved note + rewire linked-list pointers + update column head)
- `op_count: 1` = state sync only (server broadcasts current position back to client)

### Full raw log excerpts

```
2026-05-06T09:47:14.606020147Z {"timestamp":"2026-05-06T09:47:14.605748Z","level":"INFO","fields":{"message":"Received action","action":"Reorder { uuid: Some(\"b081db8a-b0f2-4914-af2e-28bda0ef05b6\"), moved_item_id: 2899, over_id: Before { id: 2194 } }"},"target":"funban_server::ws::handler"}
2026-05-06T09:47:14.608824803Z {"timestamp":"2026-05-06T09:47:14.608634Z","level":"WARN","fields":{"message":"Attempted to move note to its current position"},"target":"funban_server::sql::note"}
2026-05-06T09:47:14.608840903Z {"timestamp":"2026-05-06T09:47:14.608665Z","level":"INFO","fields":{"message":"Broadcasting operations","op_count":1},"target":"funban_server::ws::handler"}

2026-05-06T09:47:16.286343028Z {"timestamp":"2026-05-06T09:47:16.286125Z","level":"INFO","fields":{"message":"Received action","action":"Reorder { uuid: Some(\"962885b9-1a94-4638-85a1-1f08b630a3c3\"), moved_item_id: 2899, over_id: Before { id: 2194 } }"},"target":"funban_server::ws::handler"}
2026-05-06T09:47:16.289100034Z {"timestamp":"2026-05-06T09:47:16.288892Z","level":"WARN","fields":{"message":"Attempted to move note to its current position"},"target":"funban_server::sql::note"}
2026-05-06T09:47:16.289115804Z {"timestamp":"2026-05-06T09:47:16.288921Z","level":"INFO","fields":{"message":"Broadcasting operations","op_count":1},"target":"funban_server::ws::handler"}

2026-05-06T09:47:56.170639936Z {"timestamp":"2026-05-06T09:47:56.170370Z","level":"INFO","fields":{"message":"Received action","action":"Reorder { uuid: Some(\"e28a7759-289f-4dd0-ba39-ae4bb4e5a5a1\"), moved_item_id: 2899, over_id: Before { id: 2194 } }"},"target":"funban_server::ws::handler"}
2026-05-06T09:47:56.171183197Z {"timestamp":"2026-05-06T09:47:56.171098Z","level":"WARN","fields":{"message":"Attempted to move note to its current position"},"target":"funban_server::sql::note"}
2026-05-06T09:47:56.171192747Z {"timestamp":"2026-05-06T09:47:56.171120Z","level":"INFO","fields":{"message":"Broadcasting operations","op_count":1},"target":"funban_server::ws::handler"}
```

---

## Root Cause Analysis

### Bug 1 — Client: Wrong drop target for empty columns (primary cause)

When the DnD library fires the drop event over an **empty** column, there is no note inside it to use as a `Before { id }` anchor. The frontend falls back to `Before { id: 2194 }` — note `2194` appears to be the **head note of the TODO column** (the first note in the entire board list).

This produces an action that effectively says "move this note to just before the first note in TODO", which is meaningless as an empty-column drop. The correct encoding for dropping into an empty column should be a column-level target — either a dedicated `Column { id }` variant of `over_id`, or an "append to column" sentinel.

The consistent appearance of note `2194` as the fallback reference across all three sessions strongly suggests the DnD library resolves the drop container to a neighboring (or default) column's sortable context when the target droppable zone is empty.

### Bug 2 — Client: Success notification not retracted on server rejection (secondary cause / UX bug)

The frontend shows a success notification immediately on drop (optimistic update) without waiting for server confirmation. When the server responds with a no-op (`op_count: 1`) and reconciles the note back to its actual position, the notification is not reverted. The user sees "success" while simultaneously watching the note snap to the wrong location.

### Bug 3 — Server: no-op detection logic may be too broad (contributing factor)

The server WARN `"Attempted to move note to its current position"` fires because the server evaluates the requested move as equivalent to the current DB state. In this session, note `2899` appears to have been physically located at the "before note 2194" position in the linked list (i.e., already first in TODO). The server's check is correct given the data, but combined with Bug 1, the client sends the wrong position and gets a misleading rejection.

It is worth verifying whether the same WARN can be triggered for a note that is genuinely NOT at the target position — e.g., if the "same position" check has an off-by-one error for cross-column moves.

---

## Component Boundaries

| Component | Role in this bug |
|---|---|
| **funban-web (Next.js)** | Encodes the drop target. Bug 1 and Bug 2 are here. |
| **funban-server (Rust)** | Receives and validates the Reorder action. The `funban_server::sql::note` module contains the "same position" check. Bug 3 may be here. |
| **WebSocket protocol** | The `Reorder` action's `over_id: Before { id }` variant does not support column-level drops; a protocol extension may be needed. |

---

## Suggestions

> These are offered with moderate confidence pending codebase inspection.

**S1 — Add a column-level drop target variant to the protocol**  
Extend `over_id` with a `Column { id: ColumnId }` variant (or equivalent) so the client can express "drop anywhere in this column" without referencing a specific note. The server would then insert at the head (or tail, by convention) of that column.

**S2 — Fix the DnD empty-column fallback on the client**  
In the DnD event handler, detect when the drop container is a column with no notes. Instead of forwarding whatever the library resolved as `over`, build a `Column { id }` action from the column's own ID.

**S3 — Revert the success notification on server no-op**  
The optimistic notification should be tied to the server's `op_count` response. If `op_count === 1` (state sync, no real change), suppress or retract the notification and optionally show a neutral "already there" indicator.

**S4 — Add logging for the full position check in `funban_server::sql::note`**  
Log the current DB position of the note alongside the requested target when the WARN fires. This would make future debugging faster and confirm whether the "same position" check is correct or has an edge-case flaw.

---

## Infrastructure Notes

- Pod `funban-server-59fb49558c-fhnw9` had been running for ~7 minutes when these events occurred (restarted at 09:47:00 UTC). No crash or error level log was observed before or during the bug.
- The deployment uses `imagePullPolicy: Always`, so rolling restarts always pull latest for the configured tag.
- Database: `mysql.infrastructure`, database `funban-dev`, user `funban-dev`.
- No ingress errors, timeouts, or TLS issues observed in this session.
