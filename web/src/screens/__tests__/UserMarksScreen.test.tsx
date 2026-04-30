import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { User } from "@/utils/interfaces"
import { UserMarksScreen } from "../UserMarksScreen"

// Mock next-auth
const mockSession = {
  accessToken: "mock-token",
}

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: mockSession,
  }),
}))

// Mock WebSocket context
const mockUsers: User[] = [
  { id: 1, index: 1, name: "John Doe", color: "#ff0000", email: "john@example.com", marks: [] },
  { id: 2, index: 2, name: "Jane Smith", color: "#00ff00", email: "jane@example.com", marks: [] },
]

// Mock the store
let mockStoreState: any = {
  board: { notes: [], users: mockUsers },
}

jest.mock("@/store", () => ({
  useAppStore: (selector: any) => selector(mockStoreState),
  selectUsers: (state: any) => state.board.users,
}))

jest.mock("@/context/WebSocketProvider", () => ({
  useWebSocketContext: () => ({
    users: mockUsers,
    sendMessageAsync: jest.fn(),
  }),
}))

jest.mock("@/context/ConfigProvider", () => ({
  useConfig: () => ({ apiUrl: "http://localhost:3001", wsUrl: "ws://localhost:3001", env: "test" }),
}))

// Mock API fetches
const mockFetchUserMarks = jest.fn()
const mockAddUserMark = jest.fn()
const mockUpdateUserMark = jest.fn()
const mockDeleteUserMark = jest.fn()
const mockExpireAllUserMarks = jest.fn()
const mockFetchExpiredUserMarksByUserId = jest.fn()
const mockDeleteExpiredUserMarks = jest.fn()

jest.mock("@/app/api/fetches", () => ({
  fetchUserMarks: () => mockFetchUserMarks(),
  addUserMark: (...args: any[]) => mockAddUserMark(...args),
  updateUserMark: (...args: any[]) => mockUpdateUserMark(...args),
  deleteUserMark: (...args: any[]) => mockDeleteUserMark(...args),
  expireAllUserMarks: (...args: any[]) => mockExpireAllUserMarks(...args),
  fetchExpiredUserMarksByUserId: (...args: any[]) => mockFetchExpiredUserMarksByUserId(...args),
  deleteExpiredUserMarks: (...args: any[]) => mockDeleteExpiredUserMarks(...args),
}))

// Mock modals
jest.mock("@/components/AddUserMarkModal", () => ({
  AddUserMarkModal: ({ isOpen }: any) => (isOpen ? <div data-testid="add-mark-modal">Add Mark Modal</div> : null),
}))

jest.mock("@/components/EditUserMarkModal", () => ({
  EditUserMarkModal: ({ isOpen }: any) => (isOpen ? <div data-testid="edit-mark-modal">Edit Mark Modal</div> : null),
}))

describe("UserMarksScreen", () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetchUserMarks.mockResolvedValue([
      {
        id: 1,
        user_id: 1,
        mark_type: "⭐",
        custom_text: "Great work!",
        expires_after_status_ends: 3,
      },
      {
        id: 2,
        user_id: 2,
        mark_type: "⚫",
        custom_text: null,
        expires_after_status_ends: 1,
      },
    ])
  })

  describe("Basic Rendering", () => {
    it("renders without crashing", async () => {
      render(<UserMarksScreen />)

      await waitFor(() => {
        expect(screen.getByText("Users")).toBeInTheDocument()
      })
    })

    it("displays user list with mark counts", async () => {
      render(<UserMarksScreen />)

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeInTheDocument()
        expect(screen.getByText("Jane Smith")).toBeInTheDocument()
      })
    })

    it("shows loading state initially", async () => {
      render(<UserMarksScreen />)

      expect(screen.getByRole("progressbar")).toBeInTheDocument()

      // Drain the fetch so setAllMarks/setLoading don't fire after the test exits
      await waitFor(() => expect(screen.queryByRole("progressbar")).not.toBeInTheDocument())
    })

    it("fetches user marks on mount", async () => {
      render(<UserMarksScreen />)

      await waitFor(() => {
        expect(mockFetchUserMarks).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe("User Selection", () => {
    it("shows empty state when no user is selected", async () => {
      render(<UserMarksScreen />)

      await waitFor(() => {
        expect(screen.getByText("Select a user to view their marks")).toBeInTheDocument()
      })
    })

    it("displays user marks when user is selected", async () => {
      render(<UserMarksScreen />)

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeInTheDocument()
      })

      const johnUser = screen.getByText("John Doe")
      await user.click(johnUser)

      await waitFor(() => {
        expect(screen.getByText(/Marks for John Doe/)).toBeInTheDocument()
      })
    })

    it("shows Add Mark button when user is selected", async () => {
      render(<UserMarksScreen />)

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeInTheDocument()
      })

      await user.click(screen.getByText("John Doe"))

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Add Mark" })).toBeInTheDocument()
      })
    })
  })

  describe("Modal Interactions", () => {
    it("opens add mark modal when clicking Add Mark button", async () => {
      render(<UserMarksScreen />)

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeInTheDocument()
      })

      await user.click(screen.getByText("John Doe"))

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Add Mark" })).toBeInTheDocument()
      })

      await user.click(screen.getByRole("button", { name: "Add Mark" }))

      await waitFor(() => {
        expect(screen.getByTestId("add-mark-modal")).toBeInTheDocument()
      })
    })
  })

  describe("Error Handling", () => {
    it("handles fetch error gracefully", async () => {
      mockFetchUserMarks.mockRejectedValue(new Error("Network error"))

      render(<UserMarksScreen />)

      await waitFor(() => {
        expect(screen.getByText("Failed to load user marks")).toBeInTheDocument()
      })
    })
  })

  describe("Accessibility", () => {
    it("has accessible list elements", async () => {
      render(<UserMarksScreen />)

      await waitFor(() => {
        expect(screen.getByRole("list")).toBeInTheDocument()
      })
    })

    it("has accessible buttons", async () => {
      render(<UserMarksScreen />)

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeInTheDocument()
      })

      await user.click(screen.getByText("John Doe"))

      await waitFor(() => {
        const addButton = screen.getByRole("button", { name: "Add Mark" })
        expect(addButton).toBeInTheDocument()
        expect(addButton).toBeEnabled()
      })
    })
  })
})
