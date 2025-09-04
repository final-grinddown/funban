// Jest setup file for React Testing Library
import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/',
}))

// Mock Next.js Link to prevent async state updates
jest.mock('next/link', () => {
  const { forwardRef } = require('react')
  return forwardRef(({ children, href, ...props }, ref) => {
    return (
      <a href={href} ref={ref} {...props}>
        {children}
      </a>
    )
  })
})

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
  useSession: () => ({
    data: null,
    status: 'unauthenticated',
  }),
}))

// Mock environment variables if needed
process.env.NEXTAUTH_URL = 'http://localhost:3000'