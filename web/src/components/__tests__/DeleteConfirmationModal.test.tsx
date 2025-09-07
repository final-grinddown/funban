import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeleteConfirmationModal } from '../DeleteConfirmationModal'

const defaultProps = {
  isOpen: true,
  userName: 'John Doe',
  onClose: jest.fn(),
  onConfirm: jest.fn(),
  isSubmitting: false,
}

describe('DeleteConfirmationModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // Basic Rendering (4 tests)
  describe('Basic rendering', () => {
    it('renders modal when open', () => {
      render(<DeleteConfirmationModal {...defaultProps} />)

      expect(screen.getByText('Confirm Deletion')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText(/Are you sure you want to delete the user/)).toBeInTheDocument()
      expect(screen.getByText(/This operation will permanently remove the user/)).toBeInTheDocument()
    })

    it('does not render modal when closed', () => {
      render(<DeleteConfirmationModal {...defaultProps} isOpen={false} />)

      expect(screen.queryByText('Confirm Deletion')).not.toBeInTheDocument()
    })

    it('displays the correct user name', () => {
      render(<DeleteConfirmationModal {...defaultProps} userName="Jane Smith" />)

      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText(/Are you sure you want to delete the user/)).toBeInTheDocument()
    })

    it('shows warning message about permanent deletion', () => {
      render(<DeleteConfirmationModal {...defaultProps} />)

      expect(screen.getByText(/This operation will permanently remove the user and delete all related board items/)).toBeInTheDocument()
    })
  })

  // Button Interactions (4 tests)
  describe('Button interactions', () => {
    it('calls onClose when close icon is clicked', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()

      render(<DeleteConfirmationModal {...defaultProps} onClose={onClose} />)

      const closeButton = screen.getByTestId('CloseIcon').closest('button')
      expect(closeButton).toBeInTheDocument()

      await user.click(closeButton!)

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()

      render(<DeleteConfirmationModal {...defaultProps} onClose={onClose} />)

      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      await user.click(cancelButton)

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onConfirm when delete button is clicked', async () => {
      const user = userEvent.setup()
      const onConfirm = jest.fn()

      render(<DeleteConfirmationModal {...defaultProps} onConfirm={onConfirm} />)

      const deleteButton = screen.getByRole('button', { name: 'Delete' })
      await user.click(deleteButton)

      expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    it('provides accessible dialog role', () => {
      render(<DeleteConfirmationModal {...defaultProps} />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-labelledby')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
    })
  })

  // Loading State (3 tests)
  describe('Loading state', () => {
    it('shows loading spinner when submitting', () => {
      render(<DeleteConfirmationModal {...defaultProps} isSubmitting={true} />)

      expect(screen.getByRole('progressbar')).toBeInTheDocument()
      // The button has no accessible name when showing spinner, but should be disabled
      const buttons = screen.getAllByRole('button')
      const deleteButton = buttons.find(button => button.hasAttribute('disabled'))
      expect(deleteButton).toBeDisabled()
    })

    it('disables delete button when submitting', () => {
      render(<DeleteConfirmationModal {...defaultProps} isSubmitting={true} />)

      const buttons = screen.getAllByRole('button')
      const deleteButton = buttons.find(button => button.hasAttribute('disabled'))
      expect(deleteButton).toBeDisabled()
    })

    it('shows delete text when not submitting', () => {
      render(<DeleteConfirmationModal {...defaultProps} isSubmitting={false} />)

      const deleteButton = screen.getByRole('button', { name: 'Delete' })
      expect(deleteButton).toBeEnabled()
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })
  })

  // Edge Cases (3 tests)
  describe('Edge cases', () => {
    it('handles empty user name gracefully', () => {
      render(<DeleteConfirmationModal {...defaultProps} userName="" />)

      expect(screen.getByText('Confirm Deletion')).toBeInTheDocument()
      expect(screen.getByText(/Are you sure you want to delete the user/)).toBeInTheDocument()
    })

    it('handles special characters in user name', () => {
      const specialUserName = "John O'Doe & Co. <script>"
      render(<DeleteConfirmationModal {...defaultProps} userName={specialUserName} />)

      expect(screen.getByText(specialUserName)).toBeInTheDocument()
    })

    it('maintains modal state consistency', () => {
      const { rerender } = render(<DeleteConfirmationModal {...defaultProps} isOpen={false} />)
      
      expect(screen.queryByText('Confirm Deletion')).not.toBeInTheDocument()

      rerender(<DeleteConfirmationModal {...defaultProps} isOpen={true} />)
      
      expect(screen.getByText('Confirm Deletion')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
  })
})