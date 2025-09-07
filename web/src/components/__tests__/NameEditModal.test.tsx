import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NameEditModal } from '../NameEditModal'

const defaultProps = {
  isOpen: true,
  initialName: 'John Doe',
  existingNames: ['John Doe', 'Jane Smith', 'Bob Johnson'],
  onClose: jest.fn(),
  onSave: jest.fn(),
  isSubmitting: false,
}

describe('NameEditModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // Basic Rendering (4 tests)
  describe('Basic rendering', () => {
    it('renders modal when open', () => {
      render(<NameEditModal {...defaultProps} />)

      expect(screen.getByText('Edit Name')).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    })

    it('does not render modal when closed', () => {
      render(<NameEditModal {...defaultProps} isOpen={false} />)

      expect(screen.queryByText('Edit Name')).not.toBeInTheDocument()
    })

    it('pre-populates the name field with initial value', () => {
      render(<NameEditModal {...defaultProps} />)

      const nameField = screen.getByRole('textbox', { name: 'Name' })
      expect(nameField).toHaveValue('John Doe')
    })

    it('resets form when modal reopens with different initial name', async () => {
      const { rerender } = render(<NameEditModal {...defaultProps} isOpen={false} />)
      
      // Reopen with different initial name
      rerender(<NameEditModal {...defaultProps} initialName="New Name" />)

      await waitFor(() => {
        const nameField = screen.getByRole('textbox', { name: 'Name' })
        expect(nameField).toHaveValue('New Name')
      })
    })
  })

  // Form Validation - Required (2 tests)
  describe('Form validation - required field', () => {
    it('shows error when name is empty', async () => {
      const user = userEvent.setup()
      render(<NameEditModal {...defaultProps} />)

      const nameField = screen.getByRole('textbox', { name: 'Name' })
      await user.clear(nameField)

      await waitFor(() => {
        expect(screen.getByText('Name is required.')).toBeInTheDocument()
      })
    })

    it('prevents submission when name is empty', async () => {
      const user = userEvent.setup()
      const onSave = jest.fn()
      render(<NameEditModal {...defaultProps} onSave={onSave} />)

      const nameField = screen.getByRole('textbox', { name: 'Name' })
      await user.clear(nameField)

      // User should see validation error message
      await waitFor(() => {
        expect(screen.getByText('Name is required.')).toBeInTheDocument()
      })

      // Try to save - form should not submit
      const saveButton = screen.getByRole('button', { name: 'Save' })
      await user.click(saveButton)

      // onSave should not be called because validation prevents it
      expect(onSave).not.toHaveBeenCalled()
    })
  })

  // Form Validation - Length (2 tests)  
  describe('Form validation - length limits', () => {
    it('shows error when name exceeds 20 characters', async () => {
      const user = userEvent.setup()
      render(<NameEditModal {...defaultProps} />)

      const nameField = screen.getByRole('textbox', { name: 'Name' })
      await user.clear(nameField)
      await user.type(nameField, 'a'.repeat(21))

      await waitFor(() => {
        expect(screen.getByText('Name cannot exceed 20 characters.')).toBeInTheDocument()
      })
    })

    it('allows exactly 20 characters', async () => {
      const user = userEvent.setup()
      render(<NameEditModal {...defaultProps} />)

      const nameField = screen.getByRole('textbox', { name: 'Name' })
      await user.clear(nameField)
      await user.type(nameField, 'a'.repeat(20))

      await waitFor(() => {
        expect(screen.queryByText('Name cannot exceed 20 characters.')).not.toBeInTheDocument()
        const saveButton = screen.getByRole('button', { name: 'Save' })
        expect(saveButton).toBeEnabled()
      })
    })
  })

  // Form Validation - Leading Spaces (2 tests)
  describe('Form validation - leading spaces', () => {
    it('shows error when name starts with space', async () => {
      const user = userEvent.setup()
      render(<NameEditModal {...defaultProps} />)

      const nameField = screen.getByRole('textbox', { name: 'Name' })
      await user.clear(nameField)
      await user.type(nameField, ' Invalid Name')

      await waitFor(() => {
        expect(screen.getByText('Name cannot start with a space.')).toBeInTheDocument()
      })
    })

    it('allows names that do not start with space', async () => {
      const user = userEvent.setup()
      render(<NameEditModal {...defaultProps} />)

      const nameField = screen.getByRole('textbox', { name: 'Name' })
      await user.clear(nameField)
      await user.type(nameField, 'Valid Name')

      await waitFor(() => {
        expect(screen.queryByText('Name cannot start with a space.')).not.toBeInTheDocument()
        const saveButton = screen.getByRole('button', { name: 'Save' })
        expect(saveButton).toBeEnabled()
      })
    })
  })

  // Form Validation - Unique Names (3 tests)
  describe('Form validation - unique names', () => {
    it('shows error when name already exists', async () => {
      const user = userEvent.setup()
      render(<NameEditModal {...defaultProps} />)

      const nameField = screen.getByRole('textbox', { name: 'Name' })
      await user.clear(nameField)
      await user.type(nameField, 'Jane Smith') // Exists in existingNames

      await waitFor(() => {
        expect(screen.getByText('Name already exists. Please choose a different name.')).toBeInTheDocument()
      })
    })

    it('allows changing to a unique name', async () => {
      const user = userEvent.setup()
      render(<NameEditModal {...defaultProps} />)

      const nameField = screen.getByRole('textbox', { name: 'Name' })
      await user.clear(nameField)
      await user.type(nameField, 'Unique Name')

      await waitFor(() => {
        expect(screen.queryByText('Name already exists. Please choose a different name.')).not.toBeInTheDocument()
        const saveButton = screen.getByRole('button', { name: 'Save' })
        expect(saveButton).toBeEnabled()
      })
    })

    it('allows keeping the same initial name', () => {
      render(<NameEditModal {...defaultProps} />)

      // Initial name 'John Doe' exists in existingNames but should be allowed
      const nameField = screen.getByRole('textbox', { name: 'Name' })
      expect(nameField).toHaveValue('John Doe')
      
      // Save button should be disabled because form is not dirty (no changes)
      const saveButton = screen.getByRole('button', { name: 'Save' })
      expect(saveButton).toBeDisabled()
    })
  })

  // Button Interactions (3 tests)
  describe('Button interactions', () => {
    it('calls onClose when close icon is clicked', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()

      render(<NameEditModal {...defaultProps} onClose={onClose} />)

      const closeButton = screen.getByTestId('CloseIcon').closest('button')
      expect(closeButton).toBeInTheDocument()

      await user.click(closeButton!)

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()

      render(<NameEditModal {...defaultProps} onClose={onClose} />)

      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      await user.click(cancelButton)

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onSave when save button is clicked with valid data', async () => {
      const user = userEvent.setup()
      const onSave = jest.fn()

      render(<NameEditModal {...defaultProps} onSave={onSave} />)

      const nameField = screen.getByRole('textbox', { name: 'Name' })
      await user.clear(nameField)
      await user.type(nameField, 'New Valid Name')

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: 'Save' })
        expect(saveButton).toBeEnabled()
      })

      const saveButton = screen.getByRole('button', { name: 'Save' })
      await user.click(saveButton)

      expect(onSave).toHaveBeenCalledWith('New Valid Name')
    })
  })

  // Form State Management (3 tests)
  describe('Form state management', () => {
    it('disables save button when no changes are made', () => {
      render(<NameEditModal {...defaultProps} />)

      const saveButton = screen.getByRole('button', { name: 'Save' })
      expect(saveButton).toBeDisabled() // Should be disabled due to !isDirty
    })

    it('enables save button when valid changes are made', async () => {
      const user = userEvent.setup()
      render(<NameEditModal {...defaultProps} />)

      const nameField = screen.getByRole('textbox', { name: 'Name' })
      await user.clear(nameField)
      await user.type(nameField, 'Modified Name')

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: 'Save' })
        expect(saveButton).toBeEnabled()
      })
    })

    it('allows submission only when form is valid', async () => {
      const user = userEvent.setup()
      const onSave = jest.fn()
      render(<NameEditModal {...defaultProps} onSave={onSave} />)

      const nameField = screen.getByRole('textbox', { name: 'Name' })
      const saveButton = screen.getByRole('button', { name: 'Save' })
      
      // Clear field to make it invalid
      await user.clear(nameField)

      // User should see validation error
      await waitFor(() => {
        expect(screen.getByText('Name is required.')).toBeInTheDocument()
      })

      // Now enter a valid name
      await user.type(nameField, 'Valid Name')

      // Error should disappear
      await waitFor(() => {
        expect(screen.queryByText('Name is required.')).not.toBeInTheDocument()
      })

      // Now save should work
      await user.click(saveButton)
      expect(onSave).toHaveBeenCalledWith('Valid Name')
    })
  })

  // Loading State (2 tests)
  describe('Loading state', () => {
    it('shows loading spinner when submitting', () => {
      render(<NameEditModal {...defaultProps} isSubmitting={true} />)

      expect(screen.getByRole('progressbar')).toBeInTheDocument()
      
      // Find button by looking for disabled buttons since loading state changes accessible name
      const buttons = screen.getAllByRole('button')
      const disabledButton = buttons.find(button => button.hasAttribute('disabled'))
      expect(disabledButton).toBeInTheDocument()
    })

    it('shows save text when not submitting', () => {
      render(<NameEditModal {...defaultProps} isSubmitting={false} />)

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    })
  })
})