// Jest setup file for React Testing Library
import "@testing-library/jest-dom"

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => "/",
}))

// Mock Next.js Link to prevent async state updates
jest.mock("next/link", () => {
  const { forwardRef } = require("react")
  const MockLink = forwardRef(({ children, href, ...props }, ref) => {
    return (
      <a href={href} ref={ref} {...props}>
        {children}
      </a>
    )
  })
  MockLink.displayName = "MockLink"
  return MockLink
})

// Mock NextAuth
jest.mock("next-auth/react", () => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
  useSession: () => ({
    data: null,
    status: "unauthenticated",
  }),
}))

// Mock environment variables if needed
process.env.NEXTAUTH_URL = "http://localhost:3000"

// Mock react-hotkeys-hook
jest.mock("react-hotkeys-hook", () => ({
  useHotkeys: jest.fn(),
}))

// react-markdown is ESM-only and can't be parsed by Jest's CJS transform
jest.mock("react-markdown", () => function ReactMarkdown({ children }) {
  return children
})
