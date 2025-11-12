import { render } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn().mockReturnValue(new URLSearchParams()),
}))

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))

// Mock data
const mockUsers = [
  { id: 1, index: 1, name: 'Test User', color: '#ff0000', email: 'Test User@example.com', marks: [] }
]

const mockNotes = [
  {
    id: 1,
    text: 'Test note',
    state: 'todo',
    owner_id: 1,
    name: 'Test User',
    color: '#ff0000',
    predecessor_id: null,
    updated: '2024-01-01T10:00:00Z',
    created: '2024-01-01T10:00:00Z',
    tag: null,
  }
]

// Mock the store
let mockStoreState: any = {
  board: { notes: mockNotes, users: mockUsers },
  focus: { isFocus: false, currentUser: '' },
}

jest.mock('@/store', () => ({
  useAppStore: (selector: any) => selector(mockStoreState),
  selectUsers: (state: any) => state.board.users,
  selectNotes: (state: any) => state.board.notes,
}))

// Mock WebSocket context
jest.mock('@/context/WebSocketProvider', () => ({
  useWebSocketContext: jest.fn(() => ({
    users: mockUsers,
    notes: mockNotes,
    isLoading: false,
    isConnected: true,
  })),
}))

// Mock heavy child components for smoke testing
jest.mock('@/components/DashboardLayout', () => ({
  DashboardLayout: ({ children }: any) => <div data-testid="dashboard-layout">{children}</div>,
}))

jest.mock('@/components/BackdropLoading', () => ({
  BackdropLoading: ({ isInDashboard }: any) => (
    <div data-testid="backdrop-loading" data-in-dashboard={isInDashboard} />
  ),
}))

jest.mock('@/screens/BoardScreen', () => ({
  BoardScreen: () => <div data-testid="board-screen" />,
}))

jest.mock('@/screens/HistoryScreen', () => ({
  HistoryScreen: () => <div data-testid="history-screen" />,
}))

jest.mock('@/screens/HistoryDetailScreen', () => ({
  HistoryDetailScreen: ({ id }: any) => <div data-testid="history-detail-screen" data-id={id} />,
}))

jest.mock('@/screens/SettingsScreen', () => ({
  SettingsScreen: () => <div data-testid="settings-screen" />,
}))

jest.mock('@/screens/SignInScreen', () => ({
  SignInScreen: () => <div data-testid="sign-in-screen" />,
}))

const mockReplace = jest.fn()
const mockPush = jest.fn()
const mockBack = jest.fn()

describe('Page Routes Smoke Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default router mock
    ;(useRouter as jest.Mock).mockReturnValue({
      replace: mockReplace,
      push: mockPush,
      back: mockBack,
    })
    
    // Setup default session mock
    ;(useSession as jest.Mock).mockReturnValue({
      data: {
        user: { email: 'test@example.com' },
        accessToken: 'test-token',
      },
      status: 'authenticated',
    })
  })

  describe('Landing Page (/)', () => {
    it('renders and redirects to board', () => {
      const Landing = require('../page').default
      
      render(<Landing />)
      
      expect(mockReplace).toHaveBeenCalledWith('/board')
    })
  })

  describe('Board Page (/board)', () => {
    it('renders board screen when authenticated with data', () => {
      const Board = require('../board/page').default
      
      const { getByTestId } = render(<Board />)
      
      expect(getByTestId('dashboard-layout')).toBeInTheDocument()
      expect(getByTestId('board-screen')).toBeInTheDocument()
    })

    it('shows loading when not authenticated', () => {
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
      })
      
      const Board = require('../board/page').default
      
      const { getByTestId } = render(<Board />)
      
      expect(getByTestId('backdrop-loading')).toBeInTheDocument()
    })

    it('renders without crashing when no data available', () => {
      const Board = require('../board/page').default
      
      const { container } = render(<Board />)
      
      // Just verify it renders without crashing
      expect(container).toBeInTheDocument()
    })
  })

  describe('History Page (/history)', () => {
    it('renders history screen', () => {
      const History = require('../history/page').default
      
      const { getByTestId } = render(<History />)
      
      expect(getByTestId('dashboard-layout')).toBeInTheDocument()
      expect(getByTestId('history-screen')).toBeInTheDocument()
    })
  })

  describe('History Detail Page (/history/[id])', () => {
    it('can be required without throwing', () => {
      // Since this is an async server component, just verify it can be imported
      expect(() => {
        require('../history/[id]/page')
      }).not.toThrow()
    })
  })

  describe('History Last Page (/history/last)', () => {
    it('can be required without throwing', () => {
      // Simple import test for this page
      expect(() => {
        require('../history/last/page')
      }).not.toThrow()
    })
  })

  describe('Settings Page (/settings)', () => {
    it('renders settings screen', () => {
      const Settings = require('../settings/page').default
      
      const { getByTestId } = render(<Settings />)
      
      expect(getByTestId('dashboard-layout')).toBeInTheDocument()
      expect(getByTestId('settings-screen')).toBeInTheDocument()
    })
  })

  describe('Sign In Page (/sign-in)', () => {
    it('renders sign-in screen', () => {
      const SignIn = require('../sign-in/page').default
      
      const { getByTestId } = render(<SignIn />)
      
      expect(getByTestId('sign-in-screen')).toBeInTheDocument()
    })
  })
})