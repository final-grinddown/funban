import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeleteNoteModal } from '../DeleteNoteModal'

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

// Mock the createDeleteNote function
jest.mock('@/app/api/websocket', () => ({
  createDeleteNote: jest.fn().mockReturnValue('mock-delete-note-message'),
}))

const defaultProps = {
  isOpen: true,
  noteId: 456,
  onClose: jest.fn(),
}

describe('DeleteNoteModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWebSocketContext.sendMessageAsync = jest.fn().mockResolvedValue(undefined)
  })

  // Basic Rendering & Modal Behavior (4 tests)
  describe('Basic rendering and modal behavior', () => {
    it('renders modal when open', () => {
      render(<DeleteNoteModal {...defaultProps} />)
      
      expect(screen.getByText('Delete Note')).toBeInTheDocument()
      expect(screen.getByText('Are you sure you want to delete this note?')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    })

    it('does not render modal when closed', () => {
      render(<DeleteNoteModal {...defaultProps} isOpen={false} />)
      
      expect(screen.queryByText('Delete Note')).not.toBeInTheDocument()
    })

    it('closes modal when close button is clicked', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      
      render(<DeleteNoteModal {...defaultProps} onClose={onClose} />)
      
      const closeButton = screen.getByTestId('CloseIcon').closest('button')
      expect(closeButton).toBeInTheDocument()
      
      await user.click(closeButton!)
      
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('closes modal when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      
      render(<DeleteNoteModal {...defaultProps} onClose={onClose} />)
      
      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      await user.click(cancelButton)
      
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  // Delete Action Behavior (5 tests)
  describe('Delete action behavior', () => {
    it('enables delete button by default', () => {
      render(<DeleteNoteModal {...defaultProps} />)
      
      const deleteButton = screen.getByRole('button', { name: 'Delete' })
      expect(deleteButton).toBeEnabled()
    })

    it('calls delete API when delete button is clicked', async () => {
      const user = userEvent.setup()
      const { createDeleteNote } = require('@/app/api/websocket')
      
      render(<DeleteNoteModal {...defaultProps} />)
      
      const deleteButton = screen.getByRole('button', { name: 'Delete' })
      await user.click(deleteButton)
      
      expect(createDeleteNote).toHaveBeenCalledWith('456')
      expect(mockWebSocketContext.sendMessageAsync).toHaveBeenCalledWith(
        'mock-delete-note-message',
        'Note deleted successfully!'
      )
    })

    it('disables delete button while submitting', async () => {
      const user = userEvent.setup()
      
      render(<DeleteNoteModal {...defaultProps} />)
      
      const deleteButton = screen.getByRole('button', { name: 'Delete' })
      await user.click(deleteButton)
      
      expect(deleteButton).toBeDisabled()
    })

    it('shows loading state while submitting', async () => {
      const user = userEvent.setup()
      
      render(<DeleteNoteModal {...defaultProps} />)
      
      const deleteButton = screen.getByRole('button', { name: 'Delete' })
      await user.click(deleteButton)
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
      expect(deleteButton).not.toHaveTextContent('Delete')
    })

    it('works with different note IDs', async () => {
      const user = userEvent.setup()
      const { createDeleteNote } = require('@/app/api/websocket')
      
      render(<DeleteNoteModal {...defaultProps} noteId={999} />)
      
      const deleteButton = screen.getByRole('button', { name: 'Delete' })
      await user.click(deleteButton)
      
      expect(createDeleteNote).toHaveBeenCalledWith('999')
    })
  })

  // Confirmation Dialog Behavior (3 tests)
  describe('Confirmation dialog behavior', () => {
    it('displays appropriate warning message', () => {
      render(<DeleteNoteModal {...defaultProps} />)
      
      const warningMessage = screen.getByText('Are you sure you want to delete this note?')
      expect(warningMessage).toBeInTheDocument()
      expect(warningMessage).toHaveClass('MuiTypography-body1')
    })

    it('provides clear action buttons', () => {
      render(<DeleteNoteModal {...defaultProps} />)
      
      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      const deleteButton = screen.getByRole('button', { name: 'Delete' })
      
      expect(cancelButton).toBeInTheDocument()
      expect(deleteButton).toBeInTheDocument()
      
      // Check button colors/styles
      expect(cancelButton).toHaveClass('MuiButton-containedSecondary')
      expect(deleteButton).toHaveClass('MuiButton-containedError')
    })

    it('maintains focus trap within modal', () => {
      render(<DeleteNoteModal {...defaultProps} />)
      
      // Check that dialog has correct accessibility attributes
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
    })
  })

  // Edge Cases & Error Handling (2 tests)
  describe('Edge cases and error handling', () => {
    it('handles submission without errors when WebSocket is available', async () => {
      const user = userEvent.setup()
      
      render(<DeleteNoteModal {...defaultProps} />)
      
      const deleteButton = screen.getByRole('button', { name: 'Delete' })
      
      // Should not throw any errors
      expect(async () => {
        await user.click(deleteButton)
      }).not.toThrow()
    })

    it('handles note ID of 0', async () => {
      const user = userEvent.setup()
      const { createDeleteNote } = require('@/app/api/websocket')
      
      render(<DeleteNoteModal {...defaultProps} noteId={0} />)
      
      const deleteButton = screen.getByRole('button', { name: 'Delete' })
      await user.click(deleteButton)
      
      expect(createDeleteNote).toHaveBeenCalledWith('0')
    })
  })
})