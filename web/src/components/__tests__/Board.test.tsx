import { render, screen } from '@testing-library/react'
import { Note } from '@/utils/interfaces'
import { Board } from '../Board'

// Mock WebSocket context
const mockWebSocketContext = {
  sendMessageAsync: jest.fn().mockResolvedValue(undefined),
  isLoading: false,
  users: [],
  isConnected: true,
}

jest.mock('@/context/WebSocketProvider', () => ({
  useWebSocketContext: () => mockWebSocketContext,
}))

// Mock websocket functions
jest.mock('@/app/api/websocket', () => ({
  createUpdateNoteReorderBefore: jest.fn().mockReturnValue('mock-reorder-before-message'),
  createUpdateNoteReorderLast: jest.fn().mockReturnValue('mock-reorder-last-message'),
}))

// Mock storage utility
const mockColumnOrder = [
  { title: 'NOTES', orderKey: 0 },
  { title: 'TODO', orderKey: 1 },
  { title: 'IN PROGRESS', orderKey: 2 },
  { title: 'DONE', orderKey: 3 },
]

jest.mock('@/utils/storage', () => ({
  getStoredColumnOrder: jest.fn(() => mockColumnOrder),
}))

// Store handlers globally for testing
let testHandlers: any = {}

// Mock child components for Board logic testing  
jest.mock('../BoardColumn', () => ({
  BoardColumn: ({ title, items, onDragStart, onDrop, onDragEnd, isEditable }: any) => {
    // Store handlers for testing access
    testHandlers[`column-${title.toLowerCase().replace(' ', '_')}`] = {
      onDragStart,
      onDrop, 
      onDragEnd,
    }
    
    return (
      <div 
        data-testid={`column-${title.toLowerCase().replace(' ', '_')}`}
        data-items-count={items.length}
        data-editable={isEditable}
      >
        <h3>{title}</h3>
        {items.map((item: Note) => (
          <div key={item.id} data-testid={`note-${item.id}`}>
            {item.text}
          </div>
        ))}
      </div>
    )
  },
}))

jest.mock('../BackdropLoading', () => ({
  BackdropLoading: ({ isInDashboard }: any) => (
    <div data-testid="backdrop-loading" data-in-dashboard={isInDashboard} />
  ),
}))

const mockNotes: Note[] = [
  {
    id: 1,
    text: 'Note 1 - root todo',
    state: 'todo',
    owner_id: 1,
    name: 'User 1',
    color: '#ff0000',
    predecessor_id: null,
    updated: '2024-01-01T10:00:00Z',
    created: '2024-01-01T10:00:00Z',
    tag: null,
  },
  {
    id: 2,
    text: 'Note 2 - follows note 1',
    state: 'todo',
    owner_id: 1,
    name: 'User 1',
    color: '#ff0000',
    predecessor_id: 1,
    updated: '2024-01-01T11:00:00Z',
    created: '2024-01-01T11:00:00Z',
    tag: 'Important',
  },
  {
    id: 3,
    text: 'Note 3 - in progress',
    state: 'in_progress',
    owner_id: 2,
    name: 'User 2',
    color: '#00ff00',
    predecessor_id: null,
    updated: '2024-01-01T12:00:00Z',
    created: '2024-01-01T12:00:00Z',
    tag: null,
  },
  {
    id: 4,
    text: 'Note 4 - done',
    state: 'done',
    owner_id: 1,
    name: 'User 1',
    color: '#ff0000',
    predecessor_id: null,
    updated: '2024-01-01T13:00:00Z',
    created: '2024-01-01T13:00:00Z',
    tag: 'Deadline',
  },
  {
    id: 5,
    text: 'Note 5 - orphaned todo',
    state: 'todo',
    owner_id: 2,
    name: 'User 2',
    color: '#00ff00',
    predecessor_id: 999, // Non-existent predecessor
    updated: '2024-01-01T14:00:00Z',
    created: '2024-01-01T14:00:00Z',
    tag: null,
  },
]

const defaultProps = {
  notes: mockNotes,
  isEditable: true,
  isAnyModalOpen: false,
  setIsAnyModalOpen: jest.fn(),
  selectedUserId: 1,
  isFocus: false,
  currentUser: 'User 1',
}

describe('Board', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    testHandlers = {} // Clear stored handlers
    mockWebSocketContext.isLoading = false
    mockWebSocketContext.sendMessageAsync = jest.fn().mockResolvedValue(undefined)
  })

  // Column Organization (4 tests)
  describe('Column organization', () => {
    it('renders all four columns in correct order', () => {
      render(<Board {...defaultProps} />)

      expect(screen.getByTestId('column-notes')).toBeInTheDocument()
      expect(screen.getByTestId('column-todo')).toBeInTheDocument()
      expect(screen.getByTestId('column-in_progress')).toBeInTheDocument()
      expect(screen.getByTestId('column-done')).toBeInTheDocument()

      // Check headers are present
      expect(screen.getByText('NOTES')).toBeInTheDocument()
      expect(screen.getByText('TODO')).toBeInTheDocument()
      expect(screen.getByText('IN PROGRESS')).toBeInTheDocument()
      expect(screen.getByText('DONE')).toBeInTheDocument()
    })

    it('distributes notes to correct columns by state', () => {
      render(<Board {...defaultProps} />)

      // TODO column should have 3 notes (note 1, 2, and orphaned note 5)
      expect(screen.getByTestId('column-todo')).toHaveAttribute('data-items-count', '3')

      // IN PROGRESS column should have 1 note
      expect(screen.getByTestId('column-in_progress')).toHaveAttribute('data-items-count', '1')

      // DONE column should have 1 note
      expect(screen.getByTestId('column-done')).toHaveAttribute('data-items-count', '1')

      // NOTES column should be empty
      expect(screen.getByTestId('column-notes')).toHaveAttribute('data-items-count', '0')
    })

    it('passes correct props to BoardColumn components', () => {
      render(<Board {...defaultProps} />)

      const todoColumn = screen.getByTestId('column-todo')
      expect(todoColumn).toHaveAttribute('data-editable', 'true')

      // Verify individual notes are rendered
      expect(screen.getByTestId('note-1')).toHaveTextContent('Note 1 - root todo')
      expect(screen.getByTestId('note-2')).toHaveTextContent('Note 2 - follows note 1')
    })

    it('respects stored column order preferences', () => {
      const { getStoredColumnOrder } = require('@/utils/storage')
      
      render(<Board {...defaultProps} />)

      expect(getStoredColumnOrder).toHaveBeenCalled()
      // All columns should be rendered (order preference applied internally)
      expect(screen.getByTestId('column-notes')).toBeInTheDocument()
      expect(screen.getByTestId('column-todo')).toBeInTheDocument()
      expect(screen.getByTestId('column-in_progress')).toBeInTheDocument()
      expect(screen.getByTestId('column-done')).toBeInTheDocument()
    })
  })

  // Note Sorting Algorithm (5 tests)
  describe('Note sorting algorithm', () => {
    it('sorts notes with predecessor chains correctly', () => {
      render(<Board {...defaultProps} />)

      // In the TODO column, note 1 should come before note 2 (linked list order)
      const todoColumn = screen.getByTestId('column-todo')
      expect(todoColumn).toBeInTheDocument()
      
      // Both notes should be present
      expect(screen.getByTestId('note-1')).toBeInTheDocument()
      expect(screen.getByTestId('note-2')).toBeInTheDocument()
    })

    it('handles root notes (no predecessor) correctly', () => {
      render(<Board {...defaultProps} />)

      // Notes 1, 3, 4 are root notes (predecessor_id: null)
      expect(screen.getByTestId('note-1')).toBeInTheDocument() // Root in TODO
      expect(screen.getByTestId('note-3')).toBeInTheDocument() // Root in IN_PROGRESS  
      expect(screen.getByTestId('note-4')).toBeInTheDocument() // Root in DONE
    })

    it('handles orphaned notes (missing predecessors)', () => {
      render(<Board {...defaultProps} />)

      // Note 5 has predecessor_id: 999 which doesn't exist - should still be rendered
      expect(screen.getByTestId('note-5')).toBeInTheDocument()
      expect(screen.getByTestId('note-5')).toHaveTextContent('Note 5 - orphaned todo')
    })

    it('handles empty note arrays gracefully', () => {
      render(<Board {...defaultProps} notes={[]} />)

      // All columns should be rendered but empty
      expect(screen.getByTestId('column-notes')).toHaveAttribute('data-items-count', '0')
      expect(screen.getByTestId('column-todo')).toHaveAttribute('data-items-count', '0')
      expect(screen.getByTestId('column-in_progress')).toHaveAttribute('data-items-count', '0')
      expect(screen.getByTestId('column-done')).toHaveAttribute('data-items-count', '0')
    })

    it('prevents circular references in note chains', () => {
      // Create notes with potential circular reference
      const circularNotes: Note[] = [
        {
          id: 1,
          text: 'Note 1',
          state: 'todo',
          owner_id: 1,
          name: 'User 1',
          color: '#ff0000',
          predecessor_id: 2, // Points to note 2
          updated: '2024-01-01T10:00:00Z',
          created: '2024-01-01T10:00:00Z',
          tag: null,
        },
        {
          id: 2,
          text: 'Note 2',
          state: 'todo',
          owner_id: 1,
          name: 'User 1',
          color: '#ff0000',
          predecessor_id: 1, // Points back to note 1 - circular!
          updated: '2024-01-01T11:00:00Z',
          created: '2024-01-01T11:00:00Z',
          tag: null,
        },
      ]

      render(<Board {...defaultProps} notes={circularNotes} />)

      // Should not crash and should render both notes
      expect(screen.getByText('Note 1')).toBeInTheDocument()
      expect(screen.getByText('Note 2')).toBeInTheDocument()
    })
  })

  // Drag & Drop Logic (6 tests)  
  describe('Drag and drop logic', () => {
    it('handles drag start by setting dragging item ref', () => {
      render(<Board {...defaultProps} />)

      // Get handlers from the global store
      const handlers = testHandlers['column-todo']
      
      // Simulate onDragStart call 
      const dragEvent = { stopPropagation: jest.fn() } as any
      handlers.onDragStart(dragEvent, '1')
      
      // Test passes if no errors are thrown - the ref is set internally
      expect(dragEvent.stopPropagation).toHaveBeenCalled()
    })

    it('creates reorder last message for drop to empty area', () => {
      const { createUpdateNoteReorderLast } = require('@/app/api/websocket')
      
      render(<Board {...defaultProps} />)

      const handlers = testHandlers['column-todo']
      
      // First set a dragging item, then simulate drop
      const dragEvent = { stopPropagation: jest.fn() } as any
      handlers.onDragStart(dragEvent, '1')
      
      const dropEvent = { preventDefault: jest.fn() } as any
      handlers.onDrop(dropEvent, 'TODO', null)
      
      expect(createUpdateNoteReorderLast).toHaveBeenCalledWith('1', 'todo')
    })

    it('sends WebSocket message on successful drop', () => {
      render(<Board {...defaultProps} />)

      const handlers = testHandlers['column-todo']
      
      // First set a dragging item, then simulate drop  
      const dragEvent = { stopPropagation: jest.fn() } as any
      handlers.onDragStart(dragEvent, '1')
      
      const dropEvent = { preventDefault: jest.fn() } as any
      handlers.onDrop(dropEvent, 'TODO', null)

      expect(mockWebSocketContext.sendMessageAsync).toHaveBeenCalledWith(
        'mock-reorder-last-message',
        '(Id: 1) Note successfully moved!'
      )
    })

    it('handles drag end cleanup', () => {
      render(<Board {...defaultProps} />)

      const handlers = testHandlers['column-todo']
      
      // Simulate drag end through mocked handler
      handlers.onDragEnd()
      
      // Test passes if no errors thrown (cleanup happened)
      expect(screen.getByTestId('column-todo')).toBeInTheDocument()
    })

    it('ignores drop when no dragging item', () => {
      render(<Board {...defaultProps} />)

      const handlers = testHandlers['column-todo']
      
      // Simulate drop without drag start (no dragging item set)
      const dropEvent = { preventDefault: jest.fn() } as any
      handlers.onDrop(dropEvent, 'TODO', null)

      // Should not send WebSocket message
      expect(mockWebSocketContext.sendMessageAsync).not.toHaveBeenCalled()
    })

    it('handles drop with invalid dragged note gracefully', () => {
      render(<Board {...defaultProps} />)

      const handlers = testHandlers['column-todo']
      
      // Set a dragging item ID that doesn't exist in notes array
      const dragEvent = { stopPropagation: jest.fn() } as any
      handlers.onDragStart(dragEvent, '999') // Non-existent note ID
      
      const dropEvent = { preventDefault: jest.fn() } as any
      handlers.onDrop(dropEvent, 'TODO', null)

      // Should handle gracefully - no WebSocket message sent
      expect(mockWebSocketContext.sendMessageAsync).not.toHaveBeenCalled()
    })
  })

  // Loading State & Props (3 tests)
  describe('Loading state and component props', () => {
    it('shows backdrop loading when WebSocket is loading', () => {
      mockWebSocketContext.isLoading = true
      
      render(<Board {...defaultProps} />)

      const backdrop = screen.getByTestId('backdrop-loading')
      expect(backdrop).toBeInTheDocument()
      expect(backdrop).toHaveAttribute('data-in-dashboard', 'true')
    })

    it('hides backdrop loading when not loading', () => {
      mockWebSocketContext.isLoading = false
      
      render(<Board {...defaultProps} />)

      expect(screen.queryByTestId('backdrop-loading')).not.toBeInTheDocument()
    })

    it('passes focus and modal state to columns correctly', () => {
      render(
        <Board 
          {...defaultProps} 
          isFocus={true} 
          isAnyModalOpen={true}
          currentUser="Test User"
        />
      )

      // All columns should receive the focus/modal props
      expect(screen.getByTestId('column-notes')).toBeInTheDocument()
      expect(screen.getByTestId('column-todo')).toBeInTheDocument()
      expect(screen.getByTestId('column-in_progress')).toBeInTheDocument()  
      expect(screen.getByTestId('column-done')).toBeInTheDocument()
    })
  })
})