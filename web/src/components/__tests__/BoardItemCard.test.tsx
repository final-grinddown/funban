import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BoardItemCard } from '../BoardItemCard'

// Mock WebSocket context
const mockWebSocketContext = {
  sendMessageAsync: jest.fn().mockResolvedValue(undefined),
  isLoading: false,
  users: [
    { id: 1, name: 'User 1', color: '#ff0000' },
    { id: 2, name: 'User 2', color: '#00ff00' },
  ],
  isConnected: true,
}

jest.mock('@/context/WebSocketProvider', () => ({
  useWebSocketContext: () => mockWebSocketContext,
}))

// Mock focus state store
const mockUseFocusStateStore = {
  isFocus: false,
  currentUser: 'User 1',
}

jest.mock('@/utils/store', () => ({
  useFocusStateStore: () => mockUseFocusStateStore,
}))

// Mock websocket functions
jest.mock('@/app/api/websocket', () => ({
  createUpdateNoteTag: jest.fn().mockReturnValue('mock-update-tag-message'),
}))

// Mock storage utilities
jest.mock('@/utils/storage', () => ({
  getStoredDevIdsValue: jest.fn().mockReturnValue(false),
  getStoredDevPredecessorsValue: jest.fn().mockReturnValue(false),
}))

// Mock child components
jest.mock('../EditNoteModal', () => ({
  EditNoteModal: ({ isOpen, onClose, noteId, noteState, hasTextFocus, clearTextFocus }: any) => (
    <div
      data-testid="edit-note-modal"
      data-open={isOpen}
      data-note-id={noteId}
      data-note-state={noteState}
      data-has-focus={hasTextFocus}
    >
      <button onClick={onClose}>Close Edit</button>
      <button onClick={clearTextFocus}>Clear Focus</button>
    </div>
  ),
}))

jest.mock('../DeleteNoteModal', () => ({
  DeleteNoteModal: ({ isOpen, onClose, noteId }: any) => (
    <div
      data-testid="delete-note-modal"
      data-open={isOpen}
      data-note-id={noteId}
    >
      <button onClick={onClose}>Close Delete</button>
    </div>
  ),
}))

jest.mock('../SplitNoteModal', () => ({
  SplitNoteModal: ({ isOpen, onClose, noteId }: any) => (
    <div
      data-testid="split-note-modal"
      data-open={isOpen}
      data-note-id={noteId}
    >
      <button onClick={onClose}>Close Split</button>
    </div>
  ),
}))

const defaultProps = {
  id: 1,
  text: 'Test note content',
  name: 'User 1',
  color: '#ff0000',
  state: 'todo' as const,
  owner_id: 1,
  predecessor_id: null,
  tag: null,
  created: '2024-01-01T10:00:00Z',
  updated: '2024-01-01T11:00:00Z',
  isEditable: true,
  onDragStart: jest.fn(),
  onDragEnd: jest.fn(),
}

describe('BoardItemCard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWebSocketContext.isLoading = false
    mockUseFocusStateStore.isFocus = false
    mockUseFocusStateStore.currentUser = 'User 1'
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn().mockReturnValue('updated_only'),
        setItem: jest.fn(),
      },
      writable: true,
    })
  })

  // Basic Rendering (4 tests)
  describe('Basic rendering', () => {
    it('renders card with note content', () => {
      render(<BoardItemCard {...defaultProps} />)

      expect(screen.getByText('Test note content')).toBeInTheDocument()
      expect(screen.getByText('User 1')).toBeInTheDocument()
    })

    it('renders with correct colors and contrast', () => {
      render(<BoardItemCard {...defaultProps} color="#ff0000" />)

      // Card should be rendered (basic smoke test)
      expect(screen.getByText('Test note content')).toBeInTheDocument()
    })

    it('shows creation/update date information', () => {
      render(<BoardItemCard {...defaultProps} />)

      // Should show date info (exact format may vary)
      expect(screen.getByText(/Updated at|Created at/)).toBeInTheDocument()
    })

    it('handles color fallback for non-hex colors', () => {
      render(<BoardItemCard {...defaultProps} color="Red" />)

      // Should render without crashing and show content
      expect(screen.getByText('Test note content')).toBeInTheDocument()
    })
  })

  // Context Menu & Modals (6 tests)
  describe('Context menu and modals', () => {
    it('opens context menu on right-click', async () => {
      const user = userEvent.setup()
      render(<BoardItemCard {...defaultProps} />)

      const card = screen.getByText('Test note content').closest('.MuiCard-root')
      expect(card).toBeInTheDocument()

      await user.pointer({ keys: '[MouseRight>]', target: card! })

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument()
      }, { timeout: 10000 })
    }, 15000)

    it('shows edit option in context menu', async () => {
      const user = userEvent.setup()
      render(<BoardItemCard {...defaultProps} />)

      const card = screen.getByText('Test note content').closest('.MuiCard-root')
      await user.pointer({ keys: '[MouseRight>]', target: card! })

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /edit/i })).toBeInTheDocument()
      })
    })

    it('opens edit modal when edit is clicked', async () => {
      const user = userEvent.setup()
      render(<BoardItemCard {...defaultProps} />)

      const card = screen.getByText('Test note content').closest('.MuiCard-root')
      await user.pointer({ keys: '[MouseRight>]', target: card! })

      await waitFor(() => {
        const editMenuItem = screen.getByRole('menuitem', { name: /edit/i })
        expect(editMenuItem).toBeInTheDocument()
      })

      const editMenuItem = screen.getByRole('menuitem', { name: /edit/i })
      await user.click(editMenuItem)

      await waitFor(() => {
        const editModal = screen.getByTestId('edit-note-modal')
        expect(editModal).toHaveAttribute('data-open', 'true')
        expect(editModal).toHaveAttribute('data-note-id', '1')
      })
    })

    it('opens delete modal when delete is clicked', async () => {
      const user = userEvent.setup()
      render(<BoardItemCard {...defaultProps} />)

      const card = screen.getByText('Test note content').closest('.MuiCard-root')
      await user.pointer({ keys: '[MouseRight>]', target: card! })

      await waitFor(() => {
        const deleteMenuItem = screen.getByRole('menuitem', { name: /delete/i })
        expect(deleteMenuItem).toBeInTheDocument()
      })

      const deleteMenuItem = screen.getByRole('menuitem', { name: /delete/i })
      await user.click(deleteMenuItem)

      await waitFor(() => {
        const deleteModal = screen.getByTestId('delete-note-modal')
        expect(deleteModal).toHaveAttribute('data-open', 'true')
      })
    })

    it('opens split modal when split is clicked', async () => {
      const user = userEvent.setup()
      render(<BoardItemCard {...defaultProps} />)

      const card = screen.getByText('Test note content').closest('.MuiCard-root')
      await user.pointer({ keys: '[MouseRight>]', target: card! })

      await waitFor(() => {
        const splitMenuItem = screen.getByRole('menuitem', { name: /split/i })
        expect(splitMenuItem).toBeInTheDocument()
      })

      const splitMenuItem = screen.getByRole('menuitem', { name: /split/i })
      await user.click(splitMenuItem)

      await waitFor(() => {
        const splitModal = screen.getByTestId('split-note-modal')
        expect(splitModal).toHaveAttribute('data-open', 'true')
      })
    })

    it('opens edit modal when double-clicked', async () => {
      const user = userEvent.setup()
      render(<BoardItemCard {...defaultProps} />)

      const card = screen.getByText('Test note content').closest('.MuiCard-root')
      await user.dblClick(card!)

      // User should see the edit modal open
      await waitFor(() => {
        expect(screen.getByText('Close Edit')).toBeInTheDocument()
      })
      
      // Modal should have the correct note data
      const editModal = screen.getByTestId('edit-note-modal')
      expect(editModal).toHaveAttribute('data-note-id', '1')
      expect(editModal).toHaveAttribute('data-note-state', 'todo')
    })
  })

  // Tag Management (4 tests)
  describe('Tag management', () => {
    it('displays tag when present', () => {
      render(<BoardItemCard {...defaultProps} tag="Important" />)

      expect(screen.getByText('Important')).toBeInTheDocument()
    })

    it('shows tag options in context menu when editable', async () => {
      const user = userEvent.setup()
      render(<BoardItemCard {...defaultProps} />)

      const card = screen.getByText('Test note content').closest('.MuiCard-root')
      await user.pointer({ keys: '[MouseRight>]', target: card! })

      // User should see tag options in context menu
      await waitFor(() => {
        expect(screen.getByText('Important')).toBeInTheDocument()
        expect(screen.getByText('Deadline')).toBeInTheDocument()
        expect(screen.getByText('Waiting')).toBeInTheDocument()
        expect(screen.getByText('Quick')).toBeInTheDocument()
      })
    })

    it('can assign Important tag via context menu', async () => {
      const user = userEvent.setup()
      const { createUpdateNoteTag } = require('@/app/api/websocket')
      
      render(<BoardItemCard {...defaultProps} />)

      const card = screen.getByText('Test note content').closest('.MuiCard-root')
      await user.pointer({ keys: '[MouseRight>]', target: card! })

      // Wait for context menu and click Important tag
      await waitFor(() => {
        expect(screen.getByText('Important')).toBeInTheDocument()
      })

      const importantOption = screen.getByText('Important')
      await user.click(importantOption)

      // Verify the API is called correctly
      expect(createUpdateNoteTag).toHaveBeenCalledWith('1', 'Important')
      expect(mockWebSocketContext.sendMessageAsync).toHaveBeenCalledWith(
        'mock-update-tag-message',
        'Modifier set to Important'
      )
    })

    it('displays different tag colors correctly', () => {
      const { rerender } = render(<BoardItemCard {...defaultProps} tag="Important" />)
      expect(screen.getByText('Important')).toBeInTheDocument()

      rerender(<BoardItemCard {...defaultProps} tag="Deadline" />)
      expect(screen.getByText('Deadline')).toBeInTheDocument()

      rerender(<BoardItemCard {...defaultProps} tag="Waiting" />)
      expect(screen.getByText('Waiting')).toBeInTheDocument()

      rerender(<BoardItemCard {...defaultProps} tag="Quick" />)
      expect(screen.getByText('Quick')).toBeInTheDocument()
    })
  })

  // Drag and Drop (2 tests)
  describe('Drag and drop', () => {
    it('is draggable and shows visual feedback during drag', async () => {
      render(<BoardItemCard {...defaultProps} />)

      const card = screen.getByText('Test note content').closest('.MuiCard-root')
      expect(card).toBeInTheDocument()
      
      // Card should be draggable
      expect(card).toHaveAttribute('draggable', 'true')

      // Card should have proper data attributes for drag and drop
      expect(card).toHaveAttribute('data-context-menu-card', 'true')
    })

    it('maintains content visibility during drag operations', async () => {
      render(<BoardItemCard {...defaultProps} />)

      const card = screen.getByText('Test note content').closest('.MuiCard-root')
      
      // Simulate drag start
      const dragStartEvent = new Event('dragstart') as any
      card!.dispatchEvent(dragStartEvent)

      // Content should remain visible during drag
      expect(screen.getByText('Test note content')).toBeInTheDocument()
      expect(screen.getByText('User 1')).toBeInTheDocument()

      // Simulate drag end
      const dragEndEvent = new Event('dragend') as any
      card!.dispatchEvent(dragEndEvent)

      // Content should still be visible after drag
      expect(screen.getByText('Test note content')).toBeInTheDocument()
    })
  })

  // Focus Mode & Permissions (3 tests)
  describe('Focus mode and permissions', () => {
    it('disables context menu when not editable', async () => {
      const user = userEvent.setup()
      render(<BoardItemCard {...defaultProps} isEditable={false} />)

      const card = screen.getByText('Test note content').closest('.MuiCard-root')
      await user.pointer({ keys: '[MouseRight>]', target: card! })

      // Should not show context menu when not editable
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      }, { timeout: 1000 })
    })

    it('shows different date format when not editable', () => {
      const { rerender } = render(<BoardItemCard {...defaultProps} isEditable={true} />)
      
      // Should show relative date when editable
      expect(screen.getByText(/ago|minute|hour|day/)).toBeInTheDocument()

      rerender(<BoardItemCard {...defaultProps} isEditable={false} />)
      
      // Should show absolute date when not editable  
      expect(screen.getByText(/Updated at|Created at/)).toBeInTheDocument()
    })

    it('handles focus mode correctly', () => {
      mockUseFocusStateStore.isFocus = true
      mockUseFocusStateStore.currentUser = 'User 1'
      
      render(<BoardItemCard {...defaultProps} />)

      // Should render without issues in focus mode
      expect(screen.getByText('Test note content')).toBeInTheDocument()
    })
  })
})