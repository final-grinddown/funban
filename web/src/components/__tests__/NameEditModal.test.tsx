import { render, screen, waitFor, act } from '@testing-library/react'
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
    it('renders modal when open', async () => {
      render(<NameEditModal {...defaultProps} />)
      
      // Wait for React Hook Form initialization  
      await act(async () => {})
      
      expect(screen.getByText('Edit Name')).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    })

    it('does not render modal when closed', async () => {
      render(<NameEditModal {...defaultProps} isOpen={false} />)

      // Wait for React Hook Form initialization  
      await act(async () => {})

      expect(screen.queryByText('Edit Name')).not.toBeInTheDocument()
    })

    it('pre-populates the name field with initial value', async () => {
      render(<NameEditModal {...defaultProps} />)
      
      // Wait for React Hook Form initialization  
      await act(async () => {})
      
      const nameField = screen.getByRole('textbox', { name: 'Name' })
      expect(nameField).toHaveValue('John Doe')
    })

    it('resets form when modal reopens with different initial name', async () => {
      const { rerender } = render(<NameEditModal {...defaultProps} isOpen={false} />)
      
      // Wait for React Hook Form initialization  
      await act(async () => {})
      
      // Reopen with different initial name
      rerender(<NameEditModal {...defaultProps} initialName="New Name" />)

      // Wait for React Hook Form initialization  
      await act(async () => {})

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

      // Wait for React Hook Form initialization  
      await act(async () => {})

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

      // Wait for React Hook Form initialization  
      await act(async () => {})

      const nameField = screen.getByRole('textbox', { name: 'Name' })
      await user.clear(nameField)

      // User should see validation error message
      await waitFor(() => {
        expect(screen.getByText('Name is required.')).toBeInTheDocument()
      })

      // Save button should be disabled due to validation error
      const saveButton = screen.getByRole('button', { name: 'Save' })
      expect(saveButton).toBeDisabled()

      // onSave should not be called because button is disabled
      expect(onSave).not.toHaveBeenCalled()
    })
  })

  // Form Validation - Length (2 tests)  
  describe('Form validation - length limits', () => {
    it('shows error when name exceeds 20 characters', async () => {
      const user = userEvent.setup()
      render(<NameEditModal {...defaultProps} />)

      // Wait for React Hook Form initialization  
      await act(async () => {})

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

      // Wait for React Hook Form initialization  
      await act(async () => {})

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

      // Wait for React Hook Form initialization  
      await act(async () => {})

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

      // Wait for React Hook Form initialization  
      await act(async () => {})

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

      // Wait for React Hook Form initialization  
      await act(async () => {})

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

      // Wait for React Hook Form initialization  
      await act(async () => {})

      const nameField = screen.getByRole('textbox', { name: 'Name' })
      await user.clear(nameField)
      await user.type(nameField, 'Unique Name')

      await waitFor(() => {
        expect(screen.queryByText('Name already exists. Please choose a different name.')).not.toBeInTheDocument()
        const saveButton = screen.getByRole('button', { name: 'Save' })
        expect(saveButton).toBeEnabled()
      })
    })

    it('allows keeping the same initial name', async () => {
      render(<NameEditModal {...defaultProps} />)

      // Wait for React Hook Form initialization  
      await act(async () => {})

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

      // Wait for React Hook Form initialization  
      await act(async () => {})

      const closeButton = screen.getByTestId('CloseIcon').closest('button')
      expect(closeButton).toBeInTheDocument()

      await user.click(closeButton!)

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()

      render(<NameEditModal {...defaultProps} onClose={onClose} />)

      // Wait for React Hook Form initialization  
      await act(async () => {})

      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      await user.click(cancelButton)

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onSave when save button is clicked with valid data', async () => {
      const user = userEvent.setup()
      const onSave = jest.fn()

      render(<NameEditModal {...defaultProps} onSave={onSave} />)

      // Wait for React Hook Form initialization  
      await act(async () => {})

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
    it('disables save button when no changes are made', async () => {
      render(<NameEditModal {...defaultProps} />)

      // Wait for React Hook Form initialization  
      await act(async () => {})

      const saveButton = screen.getByRole('button', { name: 'Save' })
      expect(saveButton).toBeDisabled() // Should be disabled due to !isDirty
    })

    it('enables save button when valid changes are made', async () => {
      const user = userEvent.setup()
      render(<NameEditModal {...defaultProps} />)

      // Wait for React Hook Form initialization  
      await act(async () => {})

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

      // Wait for React Hook Form initialization  
      await act(async () => {})

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
    it('shows loading spinner when submitting', async () => {
      render(<NameEditModal {...defaultProps} isSubmitting={true} />)

      // Wait for React Hook Form initialization  
      await act(async () => {})

      expect(screen.getByRole('progressbar')).toBeInTheDocument()
      
      // Find button by looking for disabled buttons since loading state changes accessible name
      const buttons = screen.getAllByRole('button')
      const disabledButton = buttons.find(button => button.hasAttribute('disabled'))
      expect(disabledButton).toBeInTheDocument()
    })

    it('shows save text when not submitting', async () => {
      render(<NameEditModal {...defaultProps} isSubmitting={false} />)

      // Wait for React Hook Form initialization  
      await act(async () => {})

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    })
  })
})