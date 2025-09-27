/**
 * Schema Validation Tests
 *
 * These tests validate that our Zod schemas correctly parse all contract variants.
 * This ensures our frontend types match what the backend actually sends.
 *
 * When these tests fail, it means either:
 * 1. Our schemas need to be updated to match backend changes
 * 2. The backend broke compatibility and needs to be fixed
 */

import {
  AddNoteSchema,
  UpdateNoteTextSchema,
  UpdateNoteTagSchema,
  ReorderSchema,
  RemoveNoteSchema,
  AddUserSchema,
  UpdateUserNameSchema,
  UpdateUserColorSchema,
  RemoveUserSchema,
  DeleteNotesSchema,
  NoteUpdateMessageSchema,
  UserUpdateMessageSchema,
  NotifySnapshotSchema,
  SplitNoteSchema,
  WsActionSchema,
  WsOperationSchema,
} from '../../schemas/websocket'

// Import generated contracts
import wsActionsContract from '../../contracts/ws_actions.json'
import wsOperationsContract from '../../contracts/ws_operations.json'

describe('WebSocket Action Schema Validation', () => {
  describe('AddNote variants', () => {
    test('AddNote_full validates successfully', () => {
      const result = AddNoteSchema.safeParse(wsActionsContract.AddNote_full)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.type).toBe('AddNote')
        expect(result.data.owner).toBe(1)
        expect(result.data.state).toBe('todo')
        expect(result.data.text).toBe('Example note text')
        expect(result.data.uuid).toBe('0191a379-246e-702a-af56-b9d6e10b246e')
      }
    })

    test('AddNote_minimal validates successfully', () => {
      const result = AddNoteSchema.safeParse(wsActionsContract.AddNote_minimal)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.uuid).toBeNull()
        expect(result.data.text).toBeNull()
      }
    })

    test('AddNote_no_text validates successfully', () => {
      const result = AddNoteSchema.safeParse(wsActionsContract.AddNote_no_text)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.uuid).toBe('0191a379-246e-702a-af56-b9d6e10b246e')
        expect(result.data.text).toBeNull()
      }
    })

    test('AddNote_no_uuid validates successfully', () => {
      const result = AddNoteSchema.safeParse(wsActionsContract.AddNote_no_uuid)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.uuid).toBeNull()
        expect(result.data.text).toBe('Example note text')
      }
    })
  })

  describe('UpdateNoteTag variants', () => {
    test('UpdateNoteTag validates successfully', () => {
      const result = UpdateNoteTagSchema.safeParse(wsActionsContract.UpdateNoteTag)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.tag).toBe('Important')
        expect(result.data.uuid).toBe('0191a379-246e-702a-af56-b9d6e10b246e')
      }
    })

    test('UpdateNoteTag_none validates successfully', () => {
      const result = UpdateNoteTagSchema.safeParse(wsActionsContract.UpdateNoteTag_none)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.tag).toBeNull()
        expect(result.data.uuid).toBe('0191a379-246e-702a-af56-b9d6e10b246e')
      }
    })
  })

  describe('DeleteNotes variants', () => {
    test('DeleteNotes validates successfully', () => {
      const result = DeleteNotesSchema.safeParse(wsActionsContract.DeleteNotes)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.uuid).toBe('0191a379-246e-702a-af56-b9d6e10b246e')
        expect(result.data.owner).toBe(1)
        expect(result.data.status).toBe('done')
      }
    })

    test('DeleteNotes_all validates successfully', () => {
      const result = DeleteNotesSchema.safeParse(wsActionsContract.DeleteNotes_all)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.uuid).toBe('0191a379-246e-702a-af56-b9d6e10b246e')
        expect(result.data.owner).toBeNull()
        expect(result.data.status).toBeNull()
      }
    })
  })

  describe('Standard message validation', () => {
    test('UpdateNoteText validates successfully', () => {
      const result = UpdateNoteTextSchema.safeParse(wsActionsContract.UpdateNoteText)
      expect(result.success).toBe(true)
    })

    test('Reorder validates successfully', () => {
      const result = ReorderSchema.safeParse(wsActionsContract.Reorder)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.over_id.type).toBe('Before')
        expect((result.data.over_id as any).id).toBe(2)
      }
    })

    test('Reorder_last validates successfully', () => {
      const result = ReorderSchema.safeParse(wsActionsContract.Reorder_last)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.over_id.type).toBe('Last')
        expect((result.data.over_id as any).state).toBe('done')
      }
    })

    test('RemoveNote validates successfully', () => {
      const result = RemoveNoteSchema.safeParse(wsActionsContract.RemoveNote)
      expect(result.success).toBe(true)
    })

    test('AddUser validates successfully', () => {
      const result = AddUserSchema.safeParse(wsActionsContract.AddUser)
      expect(result.success).toBe(true)
    })

    test('NoteUpdate validates successfully', () => {
      const result = NoteUpdateMessageSchema.safeParse(wsActionsContract.NoteUpdate)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.updates).toHaveLength(2)
        expect(result.data.updates[0].target).toBe('Text')
        expect(result.data.updates[1].target).toBe('Order')
      }
    })

    test('NotifySnapshot validates successfully', () => {
      const result = NotifySnapshotSchema.safeParse(wsActionsContract.NotifySnapshot)
      expect(result.success).toBe(true)
    })

    test('SplitNote validates successfully', () => {
      const result = SplitNoteSchema.safeParse(wsActionsContract.SplitNote)
      expect(result.success).toBe(true)
    })
  })

  describe('Union schema validation', () => {
    test('WsActionSchema validates all contract variants', () => {
      const allContracts = Object.entries(wsActionsContract)

      for (const [name, contract] of allContracts) {
        const result = WsActionSchema.safeParse(contract)
        expect(result.success).toBe(true)

        if (!result.success) {
          console.error(`Failed to validate ${name}:`, result.error.issues)
        }
      }
    })
  })
})

describe('WebSocket Operation Schema Validation', () => {
  describe('Note operations', () => {
    test('NoteAdded validates successfully', () => {
      const result = WsOperationSchema.safeParse(wsOperationsContract.NoteAdded)
      expect(result.success).toBe(true)
    })

    test('NoteTextUpdated validates successfully', () => {
      const result = WsOperationSchema.safeParse(wsOperationsContract.NoteTextUpdated)
      expect(result.success).toBe(true)
    })

    test('NoteOrderChanged validates successfully', () => {
      const result = WsOperationSchema.safeParse(wsOperationsContract.NoteOrderChanged)
      expect(result.success).toBe(true)
    })

    test('NoteOrderChanged_first validates successfully', () => {
      const result = WsOperationSchema.safeParse(wsOperationsContract.NoteOrderChanged_first)
      expect(result.success).toBe(true)
    })

    test('NoteTagChanged validates successfully', () => {
      const result = WsOperationSchema.safeParse(wsOperationsContract.NoteTagChanged)
      expect(result.success).toBe(true)
    })

    test('NoteTagChanged_none validates successfully', () => {
      const result = WsOperationSchema.safeParse(wsOperationsContract.NoteTagChanged_none)
      expect(result.success).toBe(true)
    })

    test('NoteRemoved validates successfully', () => {
      const result = WsOperationSchema.safeParse(wsOperationsContract.NoteRemoved)
      expect(result.success).toBe(true)
    })
  })

  describe('User operations', () => {
    test('UserAdded validates successfully', () => {
      const result = WsOperationSchema.safeParse(wsOperationsContract.UserAdded)
      expect(result.success).toBe(true)
    })

    test('UserNameUpdated validates successfully', () => {
      const result = WsOperationSchema.safeParse(wsOperationsContract.UserNameUpdated)
      expect(result.success).toBe(true)
    })

    test('UserColorUpdated validates successfully', () => {
      const result = WsOperationSchema.safeParse(wsOperationsContract.UserColorUpdated)
      expect(result.success).toBe(true)
    })

    test('UserRemoved validates successfully', () => {
      const result = WsOperationSchema.safeParse(wsOperationsContract.UserRemoved)
      expect(result.success).toBe(true)
    })
  })

  describe('System operations', () => {
    test('ActionFinished validates successfully', () => {
      const result = WsOperationSchema.safeParse(wsOperationsContract.ActionFinished)
      expect(result.success).toBe(true)
    })

    test('SnapshotCreated validates successfully', () => {
      const result = WsOperationSchema.safeParse(wsOperationsContract.SnapshotCreated)
      expect(result.success).toBe(true)
    })

    test('Error validates successfully', () => {
      const result = WsOperationSchema.safeParse(wsOperationsContract.Error)
      expect(result.success).toBe(true)
    })

    test('Error_global validates successfully', () => {
      const result = WsOperationSchema.safeParse(wsOperationsContract.Error_global)
      expect(result.success).toBe(true)
    })
  })

  describe('Union schema validation', () => {
    test('WsOperationSchema validates all contract variants', () => {
      const allContracts = Object.entries(wsOperationsContract)

      for (const [name, contract] of allContracts) {
        const result = WsOperationSchema.safeParse(contract)
        expect(result.success).toBe(true)

        if (!result.success) {
          console.error(`Failed to validate ${name}:`, result.error.issues)
        }
      }
    })
  })
})

describe('Type Safety Validation', () => {
  test('schemas correctly identify required vs optional fields', () => {
    // Test that required fields are enforced
    const invalidAddNote = {
      type: 'AddNote',
      // Missing required 'owner' field
      state: 'todo',
    }

    const result = AddNoteSchema.safeParse(invalidAddNote)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some(issue => issue.path.includes('owner'))).toBe(true)
    }
  })

  test('schemas correctly handle nullable optional fields', () => {
    const noteWithNullTag = {
      type: 'UpdateNoteTag',
      uuid: null,
      id: 1,
      tag: null,
    }

    const result = UpdateNoteTagSchema.safeParse(noteWithNullTag)
    expect(result.success).toBe(true)
  })

  test('schemas reject invalid enum values', () => {
    const invalidTag = {
      type: 'UpdateNoteTag',
      uuid: 'test-uuid',
      id: 1,
      tag: 'InvalidTag', // Should be one of: Important, Deadline, Waiting, Quick
    }

    const result = UpdateNoteTagSchema.safeParse(invalidTag)
    expect(result.success).toBe(false)
  })
})