import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddNewNoteModal } from '../AddNewNoteModal'
import { IUser } from '@/utils/interfaces'

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

// Mock the createNewNote function
jest.mock('@/app/api/websocket', () => ({
  createNewNote: jest.fn().mockReturnValue('mock-websocket-message'),
}))

// Mock TextLengthCounter component
jest.mock('../TextLengthCounter', () => ({
  TextLengthCounter: ({ currentLength, maxLength }: any) => (
    <div data-testid="text-length-counter">
      {currentLength}/{maxLength}
    </div>
  ),
}))

const mockUsers: IUser[] = [
  { id: 1, name: 'John Doe', color: '#ff0000' },
  { id: 2, name: 'Jane Smith', color: '#00ff00' },
  { id: 3, name: 'Bob Johnson', color: '#0000ff' },
]

const defaultProps = {
  users: mockUsers,
  isOpen: true,
  onClose: jest.fn(),
}

describe('AddNewNoteModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWebSocketContext.isLoading = false
    mockWebSocketContext.sendMessageAsync = jest.fn().mockResolvedValue(undefined)
  })

  // Basic Rendering & Modal Behavior (4 tests)
  describe('Basic rendering and modal behavior', () => {
    it('renders modal when open', () => {
      render(<AddNewNoteModal {...defaultProps} />)
      
      expect(screen.getByText('Add New Note')).toBeInTheDocument()
      expect(screen.getByLabelText('State')).toBeInTheDocument()
      expect(screen.getByLabelText('Note Owner')).toBeInTheDocument()
      expect(screen.getByLabelText('Note Text')).toBeInTheDocument()
    })

    it('does not render modal when closed', () => {
      render(<AddNewNoteModal {...defaultProps} isOpen={false} />)
      
      expect(screen.queryByText('Add New Note')).not.toBeInTheDocument()
    })

    it('closes modal when close button is clicked', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      
      render(<AddNewNoteModal {...defaultProps} onClose={onClose} />)
      
      // Look for the close icon button (it has CloseIcon but no accessible name)
      const closeButton = screen.getByTestId('CloseIcon').closest('button')
      expect(closeButton).toBeInTheDocument()
      
      await user.click(closeButton!)
      
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('closes modal when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      
      render(<AddNewNoteModal {...defaultProps} onClose={onClose} />)
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)
      
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  // Form Field Interactions (5 tests)
  describe('Form field interactions', () => {
    it('allows selecting a state', async () => {
      const user = userEvent.setup()
      render(<AddNewNoteModal {...defaultProps} />)
      
      const stateSelect = screen.getByRole('combobox', { name: 'State' })
      await user.click(stateSelect)
      
      await waitFor(() => {
        const todoOption = screen.getByRole('option', { name: 'To Do' })
        expect(todoOption).toBeInTheDocument()
      })
      
      const todoOption = screen.getByRole('option', { name: 'To Do' })
      await user.click(todoOption)
      
      await waitFor(() => {
        expect(stateSelect).toHaveTextContent('To Do')
      })
    })

    it('allows selecting a note owner', async () => {
      const user = userEvent.setup()
      render(<AddNewNoteModal {...defaultProps} />)
      
      const ownerSelect = screen.getByRole('combobox', { name: 'Note Owner' })
      await user.click(ownerSelect)
      
      await waitFor(() => {
        const johnOption = screen.getByRole('option', { name: 'John Doe' })
        expect(johnOption).toBeInTheDocument()
      })
      
      const johnOption = screen.getByRole('option', { name: 'John Doe' })
      await user.click(johnOption)
      
      await waitFor(() => {
        expect(ownerSelect).toHaveTextContent('John Doe')
      })
    })

    it('allows typing in note text field', async () => {
      const user = userEvent.setup()
      render(<AddNewNoteModal {...defaultProps} />)
      
      const textField = screen.getByLabelText('Note Text')
      await user.type(textField, 'Test note content')
      
      expect(textField).toHaveValue('Test note content')
    })

    it('shows text length counter when text is entered', async () => {
      const user = userEvent.setup()
      render(<AddNewNoteModal {...defaultProps} />)
      
      const textField = screen.getByLabelText('Note Text')
      await user.type(textField, 'Test')
      
      expect(screen.getByTestId('text-length-counter')).toBeInTheDocument()
      expect(screen.getByText('4/1000')).toBeInTheDocument()
    })

    it('allows toggling save and create next checkbox', async () => {
      const user = userEvent.setup()
      render(<AddNewNoteModal {...defaultProps} />)
      
      const checkbox = screen.getByRole('checkbox', { name: 'Save and Create Next' })
      
      expect(checkbox).not.toBeChecked()
      await user.click(checkbox)
      expect(checkbox).toBeChecked()
    })
  })

  // Form Validation (4 tests)
  describe('Form validation', () => {
    it('disables create button when form is invalid', () => {
      render(<AddNewNoteModal {...defaultProps} />)
      
      const createButton = screen.getByRole('button', { name: 'Create' })
      expect(createButton).toBeDisabled()
    })

    it('enables create button when form is valid', async () => {
      const user = userEvent.setup()
      render(<AddNewNoteModal {...defaultProps} />)
      
      // Fill required fields
      const textField = screen.getByLabelText('Note Text')
      await user.type(textField, 'Test note')
      
      const ownerSelect = screen.getByRole('combobox', { name: 'Note Owner' })
      await user.click(ownerSelect)
      
      await waitFor(() => {
        const johnOption = screen.getByRole('option', { name: 'John Doe' })
        expect(johnOption).toBeInTheDocument()
      })
      const johnOption = screen.getByRole('option', { name: 'John Doe' })
      await user.click(johnOption)
      
      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: 'Create' })
        expect(createButton).toBeEnabled()
      })
    })

    it('shows error when owner is not selected', async () => {
      const user = userEvent.setup()
      render(<AddNewNoteModal {...defaultProps} />)
      
      // Fill text but not owner
      const textField = screen.getByLabelText('Note Text')
      await user.type(textField, 'Test note')
      
      const createButton = screen.getByRole('button', { name: 'Create' })
      expect(createButton).toBeDisabled()
    })

    it('disables create button when text exceeds max length', async () => {
      const user = userEvent.setup()
      render(<AddNewNoteModal {...defaultProps} />)
      
      // Create text longer than MaxTextLength (1000) - use paste for speed
      const longText = 'a'.repeat(1001)
      
      const textField = screen.getByLabelText('Note Text')
      await user.clear(textField)
      await user.click(textField)
      await user.paste(longText)
      
      const ownerSelect = screen.getByRole('combobox', { name: 'Note Owner' })
      await user.click(ownerSelect)
      
      await waitFor(() => {
        const johnOption = screen.getByRole('option', { name: 'John Doe' })
        expect(johnOption).toBeInTheDocument()
      })
      
      const johnOption = screen.getByRole('option', { name: 'John Doe' })
      await user.click(johnOption)
      
      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: 'Create' })
        expect(createButton).toBeDisabled()
      })
    })
  })

  // Form Submission (4 tests)
  describe('Form submission', () => {
    it('submits form with correct data', async () => {
      const user = userEvent.setup()
      const { createNewNote } = require('@/app/api/websocket')
      
      render(<AddNewNoteModal {...defaultProps} />)
      
      // Fill form
      const textField = screen.getByLabelText('Note Text')
      await user.clear(textField)
      await user.type(textField, 'Test note content')
      
      const stateSelect = screen.getByRole('combobox', { name: 'State' })
      await user.click(stateSelect)
      
      await waitFor(() => {
        const todoOption = screen.getByRole('option', { name: 'To Do' })
        expect(todoOption).toBeInTheDocument()
      })
      const todoOption = screen.getByRole('option', { name: 'To Do' })
      await user.click(todoOption)
      
      const ownerSelect = screen.getByRole('combobox', { name: 'Note Owner' })
      await user.click(ownerSelect)
      
      await waitFor(() => {
        const johnOption = screen.getByRole('option', { name: 'John Doe' })
        expect(johnOption).toBeInTheDocument()
      })
      const johnOption = screen.getByRole('option', { name: 'John Doe' })
      await user.click(johnOption)
      
      // Submit
      const createButton = screen.getByRole('button', { name: 'Create' })
      await user.click(createButton)
      
      expect(createNewNote).toHaveBeenCalledWith('1', 'Test note content', 'todo')
      expect(mockWebSocketContext.sendMessageAsync).toHaveBeenCalledWith(
        'mock-websocket-message',
        'New note created!'
      )
    })

    it('shows loading state during submission', async () => {
      const user = userEvent.setup()
      
      render(<AddNewNoteModal {...defaultProps} />)
      
      // Fill form
      const textField = screen.getByLabelText('Note Text')
      await user.type(textField, 'Test note')
      
      const ownerSelect = screen.getByRole('combobox', { name: 'Note Owner' })
      await user.click(ownerSelect)
      
      await waitFor(() => {
        const johnOption = screen.getByRole('option', { name: 'John Doe' })
        expect(johnOption).toBeInTheDocument()
      })
      const johnOption = screen.getByRole('option', { name: 'John Doe' })
      await user.click(johnOption)
      
      const createButton = screen.getByRole('button', { name: 'Create' })
      await user.click(createButton)
      
      // Check that the button shows loading state (progress bar appears)
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('closes modal after successful submission (without save and create next)', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      
      render(<AddNewNoteModal {...defaultProps} onClose={onClose} />)
      
      // Fill form
      const textField = screen.getByLabelText('Note Text')
      await user.type(textField, 'Test note')
      
      const ownerSelect = screen.getByRole('combobox', { name: 'Note Owner' })
      await user.click(ownerSelect)
      
      await waitFor(() => {
        const johnOption = screen.getByRole('option', { name: 'John Doe' })
        expect(johnOption).toBeInTheDocument()
      })
      const johnOption = screen.getByRole('option', { name: 'John Doe' })
      await user.click(johnOption)
      
      // Submit
      const createButton = screen.getByRole('button', { name: 'Create' })
      await user.click(createButton)
      
      // Wait for the effect to process and close modal
      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1)
      })
    })

    it('keeps modal open and resets form when save and create next is checked', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      
      render(<AddNewNoteModal {...defaultProps} onClose={onClose} />)
      
      // Fill form and check save and create next
      const textField = screen.getByLabelText('Note Text')
      await user.clear(textField)
      await user.type(textField, 'Test note')
      
      const stateSelect = screen.getByRole('combobox', { name: 'State' })
      await user.click(stateSelect)
      
      await waitFor(() => {
        const todoOption = screen.getByRole('option', { name: 'To Do' })
        expect(todoOption).toBeInTheDocument()
      })
      const todoOption = screen.getByRole('option', { name: 'To Do' })
      await user.click(todoOption)
      
      const ownerSelect = screen.getByRole('combobox', { name: 'Note Owner' })
      await user.click(ownerSelect)
      
      await waitFor(() => {
        const johnOption = screen.getByRole('option', { name: 'John Doe' })
        expect(johnOption).toBeInTheDocument()
      })
      const johnOption = screen.getByRole('option', { name: 'John Doe' })
      await user.click(johnOption)
      
      const checkbox = screen.getByRole('checkbox', { name: 'Save and Create Next' })
      await user.click(checkbox)
      
      // Submit
      const createButton = screen.getByRole('button', { name: 'Create' })
      await user.click(createButton)
      
      // Modal should not close, text should be cleared but other fields preserved
      await waitFor(() => {
        expect(textField).toHaveValue('')
        expect(stateSelect).toHaveTextContent('To Do')
        expect(ownerSelect).toHaveTextContent('John Doe')
        expect(checkbox).toBeChecked()
      })
      
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  // Default Values & Focus Management (3 tests)
  describe('Default values and focus management', () => {
    it('sets default values when provided', async () => {
      const defaultValues = {
        state: 'todo',
        ownerId: '2',
      }
      
      render(<AddNewNoteModal {...defaultProps} defaultValues={defaultValues} />)
      
      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: 'State' })).toHaveTextContent('To Do')
        expect(screen.getByRole('combobox', { name: 'Note Owner' })).toHaveTextContent('Jane Smith')
      })
    })

    it('focuses text field when hasTextFocus is true', async () => {
      const clearTextFocus = jest.fn()
      
      render(
        <AddNewNoteModal
          {...defaultProps}
          hasTextFocus={true}
          clearTextFocus={clearTextFocus}
        />
      )
      
      await waitFor(() => {
        const textField = screen.getByLabelText('Note Text')
        expect(textField).toHaveFocus()
        expect(clearTextFocus).toHaveBeenCalledTimes(1)
      })
    })

    it('supports keyboard shortcut submission (Shift+Enter)', async () => {
      const user = userEvent.setup()
      const { createNewNote } = require('@/app/api/websocket')
      
      render(<AddNewNoteModal {...defaultProps} />)
      
      // Fill required fields
      const textField = screen.getByLabelText('Note Text')
      await user.type(textField, 'Test note')
      
      const ownerSelect = screen.getByRole('combobox', { name: 'Note Owner' })
      await user.click(ownerSelect)
      
      await waitFor(() => {
        const johnOption = screen.getByRole('option', { name: 'John Doe' })
        expect(johnOption).toBeInTheDocument()
      })
      const johnOption = screen.getByRole('option', { name: 'John Doe' })
      await user.click(johnOption)
      
      // Focus back to text field and use keyboard shortcut
      textField.focus()
      await user.keyboard('{Shift>}{Enter}{/Shift}')
      
      expect(createNewNote).toHaveBeenCalledWith('1', 'Test note', '')
    })
  })
})