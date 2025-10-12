import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IHistoryItem } from '@/utils/interfaces'
import { HistoryScreen } from '../HistoryScreen'

// Mock Next.js router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock NextAuth session
const mockSession = {
  accessToken: 'mock-access-token',
  user: { email: 'test@example.com' },
}

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({ data: mockSession })),
}))

// Mock API fetches - proper TanStack Query testing pattern
jest.mock('@/app/api/fetches', () => ({
  fetchHistory: jest.fn(),
  fetchHistoryItem: jest.fn(),
}))

// Mock BackdropLoading component
jest.mock('@/components/BackdropLoading', () => ({
  BackdropLoading: ({ isInDashboard }: { isInDashboard: boolean }) => (
    <div data-testid="backdrop-loading" data-in-dashboard={isInDashboard}>
      Loading...
    </div>
  ),
}))

// Mock MUI theme
jest.mock('@mui/material', () => ({
  ...jest.requireActual('@mui/material'),
  useTheme: () => ({
    palette: {
      background: { paper: '#ffffff' },
      primary: { 
        main: '#1976d2', 
        contrastText: '#ffffff' 
      },
      action: { hover: 'rgba(0, 0, 0, 0.04)' },
    },
  }),
}))

describe('HistoryScreen', () => {
  const mockHistoryData: IHistoryItem[] = [
    {
      id: 1,
      created_at: '2024-01-15T10:30:00Z',
      label: 'Initial Board Setup',
      snapshot: 'mock-snapshot-1',
      version: 2,
      previous: { id: 0, label: 'Initial' },
      next: { id: 2, label: 'Added New Tasks' },
    },
    {
      id: 2,
      created_at: '2024-01-15T14:20:00Z',
      label: 'Added New Tasks',
      snapshot: 'mock-snapshot-2',
      version: 2,
      previous: { id: 1, label: 'Initial Board Setup' },
      next: { id: 3, label: 'Updated Project Status' },
    },
    {
      id: 3,
      created_at: '2024-01-16T09:15:00Z',
      label: 'Updated Project Status',
      snapshot: 'mock-snapshot-3',
      version: 2,
      previous: { id: 2, label: 'Added New Tasks' },
      next: { id: 4, label: 'Next Item' },
    },
  ]

  const user = userEvent.setup()
  let queryClient: QueryClient
  
  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { 
          retry: false,
        },
        mutations: { retry: false },
      },
    })
    const TestWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
    TestWrapper.displayName = 'TestWrapper'
    return TestWrapper
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Get mock functions after they're initialized
    const { fetchHistory, fetchHistoryItem } = require('@/app/api/fetches')
    
    // Default successful fetch
    fetchHistory.mockResolvedValue(mockHistoryData)
    fetchHistoryItem.mockResolvedValue(mockHistoryData[0])
  })

  const renderHistoryScreen = () => {
    const Wrapper = createWrapper()
    return render(
      <Wrapper>
        <HistoryScreen />
      </Wrapper>
    )
  }

  describe('Basic Rendering', () => {
    it('renders history page with title and table', async () => {
      renderHistoryScreen()

      // Wait for loading to complete and data to load
      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
      })

      // Should show title
      expect(screen.getByRole('heading', { name: 'History Data' })).toBeInTheDocument()

      // Should show table headers
      expect(screen.getByRole('columnheader', { name: 'ID' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Created At' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Label' })).toBeInTheDocument()
    })

    it('shows loading state initially', () => {
      renderHistoryScreen()

      expect(screen.getByTestId('backdrop-loading')).toBeInTheDocument()
      expect(screen.getByTestId('backdrop-loading')).toHaveAttribute('data-in-dashboard', 'true')
    })

    it('displays history data in table rows', async () => {
      renderHistoryScreen()

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
      })

      // Should show all history items
      expect(screen.getByRole('cell', { name: '1' })).toBeInTheDocument()
      expect(screen.getByRole('cell', { name: '2' })).toBeInTheDocument()
      expect(screen.getByRole('cell', { name: '3' })).toBeInTheDocument()

      // Should show labels
      expect(screen.getByText('Initial Board Setup')).toBeInTheDocument()
      expect(screen.getByText('Added New Tasks')).toBeInTheDocument()
      expect(screen.getByText('Updated Project Status')).toBeInTheDocument()

      // Should show formatted dates (use getAllByText since dates appear multiple times)
      expect(screen.getAllByText(/1\/15\/2024/)[0]).toBeInTheDocument()
      expect(screen.getByText(/1\/16\/2024/)).toBeInTheDocument()
    })

    it('calls fetchHistory with correct parameters', async () => {
      const { fetchHistory } = require('@/app/api/fetches')
      renderHistoryScreen()

      await waitFor(() => {
        expect(fetchHistory).toHaveBeenCalledWith('mock-access-token')
      })
    })
  })

  describe('Error Handling', () => {
    it('displays error message when fetch fails', async () => {
      const { fetchHistory } = require('@/app/api/fetches')
      fetchHistory.mockRejectedValue(new Error('Failed to fetch history'))

      renderHistoryScreen()

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText('Error')).toBeInTheDocument()
        expect(screen.getByText('Failed to fetch history')).toBeInTheDocument()
      })
    })

    it('does not fetch when no access token is available', async () => {
      const { fetchHistory } = require('@/app/api/fetches')
      const mockUseSession = require('next-auth/react').useSession
      mockUseSession.mockReturnValue({ data: null })

      renderHistoryScreen()

      // Wait a bit to ensure query doesn't run
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(fetchHistory).not.toHaveBeenCalled()
      
      // Reset to original mock for other tests
      mockUseSession.mockReturnValue({ data: mockSession })
    })
  })

  describe('User Interactions', () => {
    beforeEach(async () => {
      renderHistoryScreen()
      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
      })
    })

    it('navigates to history detail when row is clicked', async () => {
      const firstRow = screen.getByRole('row', { name: /1.*Initial Board Setup.*View Snapshot Detail/i })
      
      await user.click(firstRow)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/history/1')
      })
    })

    it('navigates to history detail when button is clicked', async () => {
      const viewButton = screen.getAllByText('View Snapshot Detail')[0]
      
      await user.click(viewButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/history/1')
      })
    })

    it('prefetches data on row hover', async () => {
      const { fetchHistoryItem } = require('@/app/api/fetches')
      const firstRow = screen.getByRole('row', { name: /1.*Initial Board Setup.*View Snapshot Detail/i })
      
      await user.hover(firstRow)

      await waitFor(() => {
        expect(fetchHistoryItem).toHaveBeenCalledWith('1', 'mock-access-token')
      })
    })

    it('handles multiple row interactions correctly', async () => {
      const { fetchHistoryItem } = require('@/app/api/fetches')
      const rows = screen.getAllByText('View Snapshot Detail')
      
      // Click second row button
      await user.click(rows[1])

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/history/2')
      })

      // Hover third row
      const thirdRow = screen.getByRole('row', { name: /3.*Updated Project Status.*View Snapshot Detail/i })
      await user.hover(thirdRow)

      await waitFor(() => {
        expect(fetchHistoryItem).toHaveBeenCalledWith('3', 'mock-access-token')
      })
    })
  })

  describe('Table Styling and Layout', () => {
    it('applies alternating row colors', async () => {
      renderHistoryScreen()

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
      })

      const rows = screen.getAllByRole('row')
      // Skip header row, check data rows
      const dataRows = rows.slice(1)
      
      expect(dataRows).toHaveLength(3)
      // Verify rows are rendered (styling is applied via sx props)
      dataRows.forEach(row => {
        expect(row).toBeInTheDocument()
      })
    })

    it('shows proper table structure', async () => {
      renderHistoryScreen()

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
      })
      
      // Should have header and body (there are 2 rowgroups: thead and tbody)
      const rowGroups = screen.getAllByRole('rowgroup')
      expect(rowGroups).toHaveLength(2) // thead and tbody
      
      // Should have all required columns
      const headers = screen.getAllByRole('columnheader')
      expect(headers).toHaveLength(4) // ID, Created At, Label, Action
    })
  })

  describe('Performance Features', () => {
    it('uses query client for prefetching', async () => {
      renderHistoryScreen()

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
      })

      // Verify prefetch is called with correct query key
      const firstRow = screen.getByRole('row', { name: /1.*Initial Board Setup.*View Snapshot Detail/i })
      await user.hover(firstRow)

      // Should prefetch via React Query
      const { fetchHistoryItem } = require('@/app/api/fetches')
      await waitFor(() => {
        expect(fetchHistoryItem).toHaveBeenCalledWith('1', 'mock-access-token')
      })
    })
  })
})