import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { signIn } from 'next-auth/react'
import { SignInScreen } from '../SignInScreen'

// Mock Next.js navigation
const mockGet = jest.fn()

// Create a stable mock for useSearchParams
const mockSearchParams = {
  get: mockGet,
}

jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}))

// Mock NextAuth signIn
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}))

// Mock the theme and MUI components for cleaner tests
jest.mock('@mui/material', () => ({
  ...jest.requireActual('@mui/material'),
  useTheme: () => ({
    palette: {
      divider: '#e0e0e0',
    },
  }),
}))

describe('SignInScreen', () => {
  const mockSignIn = signIn as jest.MockedFunction<typeof signIn>
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
    mockGet.mockReturnValue(null) // Default: no URL params
  })

  describe('Form Rendering', () => {
    it('renders the sign-in form with all required fields', () => {
      render(<SignInScreen />)

      expect(screen.getByRole('heading', { name: 'Sign in to Funban' })).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('shows proper input types', () => {
      render(<SignInScreen />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      expect(emailInput).toHaveAttribute('type', 'email')
      expect(passwordInput).toHaveAttribute('type', 'password')
    })
  })

  describe('Form Validation', () => {
    it('shows validation error for empty email', async () => {
      render(<SignInScreen />)

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument()
      })
    })

    it('shows validation error for invalid email format', async () => {
      render(<SignInScreen />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
      })
    })

    it('shows validation error for empty password', async () => {
      render(<SignInScreen />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Password is required')).toBeInTheDocument()
      })
    })

    it('shows validation error for short password', async () => {
      render(<SignInScreen />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, '123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument()
      })
    })

    it('does not show validation errors for valid input', async () => {
      render(<SignInScreen />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')

      // No validation errors should be visible
      expect(screen.queryByText('Email is required')).not.toBeInTheDocument()
      expect(screen.queryByText('Password is required')).not.toBeInTheDocument()
      expect(screen.queryByText('Enter a valid email address')).not.toBeInTheDocument()
      expect(screen.queryByText('Password must be at least 6 characters')).not.toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    it('calls NextAuth signIn with correct parameters on valid form submission', async () => {
      mockGet.mockReturnValue('http://localhost:3000/board') // Mock callbackUrl

      render(<SignInScreen />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('credentials', {
          redirect: true,
          username: 'test@example.com',
          password: 'password123',
          callbackUrl: 'http://localhost:3000/board',
        })
      })
    })

    it('uses default callbackUrl when none provided', async () => {
      mockGet.mockReturnValue(null) // No callbackUrl in URL params

      render(<SignInScreen />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('credentials', {
          redirect: true,
          username: 'test@example.com',
          password: 'password123',
          callbackUrl: '/', // Default from ERoutes.Landing
        })
      })
    })

    it('shows loading state during form submission', async () => {
      // Mock signIn to not resolve immediately
      mockSignIn.mockImplementation(() => new Promise(() => {}))

      render(<SignInScreen />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      // Should show loading spinner
      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument()
      })

      // Button should be disabled
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Error Handling', () => {
    it('displays error message for CredentialsSignin error', () => {
      mockGet.mockImplementation((param: string) => {
        if (param === 'error') return 'CredentialsSignin'
        if (param === 'callbackUrl') return null
        return null
      })

      render(<SignInScreen />)

      expect(screen.getByText('Invalid credentials.')).toBeInTheDocument()
    })

    it('displays generic error message for other errors', () => {
      mockGet.mockImplementation((param: string) => {
        if (param === 'error') return 'SomeOtherError'
        if (param === 'callbackUrl') return null
        return null
      })

      render(<SignInScreen />)

      expect(screen.getByText('Failed to sign in.')).toBeInTheDocument()
    })

    it('does not display error when no error param present', () => {
      mockGet.mockReturnValue(null) // No error param

      render(<SignInScreen />)

      expect(screen.queryByText('Invalid credentials.')).not.toBeInTheDocument()
      expect(screen.queryByText('Failed to sign in.')).not.toBeInTheDocument()
    })
  })
})