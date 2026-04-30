import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Note, User } from "@/utils/interfaces"
import { BoardScreen } from "../BoardScreen"

// Mock react-hotkeys-hook for keyboard shortcut testing
jest.mock("react-hotkeys-hook", () => ({
  useHotkeys: jest.fn(),
}))

// Mock custom hooks with controlled state
const mockUseBoardModalManagement = {
  isEndStatusModalOpen: false,
  isAddNewNoteModalOpen: false,
  isAddUserMarkModalOpen: false,
  anchorEl: null,
  openMenu: false,
  handleCloseEndStatusModal: jest.fn(),
  handleOpenAddNewNoteModal: jest.fn(),
  handleOpenEndStatusModal: jest.fn(),
  handleCloseAddNewNoteModal: jest.fn(),
  handleOpenAddUserMarkModal: jest.fn(),
  handleCloseAddUserMarkModal: jest.fn(),
  handleOpenMenu: jest.fn(),
  handleCloseMenu: jest.fn(),
  isAnyModalOpen: false,
  setIsAnyModalOpen: jest.fn(),
}

const mockUseFocusManagement = {
  isFocus: false,
  shouldRenderFocus: false,
  handleStartFocus: jest.fn(),
  handleEndFocus: jest.fn(),
}

const mockUseUserSelection = {
  user: "1",
  handleChange: jest.fn(),
  handlePrevUser: jest.fn(),
  handleNextUser: jest.fn(),
}

jest.mock("@/hooks/useBoardModalManagement", () => ({
  useBoardModalManagement: jest.fn(() => mockUseBoardModalManagement),
}))

jest.mock("@/hooks/useFocusManagement", () => ({
  useFocusManagement: jest.fn(() => mockUseFocusManagement),
}))

jest.mock("@/context/WebSocketProvider", () => ({
  useWebSocketContext: jest.fn(() => ({
    sendMessageAsync: jest.fn(),
  })),
}))

jest.mock("@/context/ConfigProvider", () => ({
  useConfig: () => ({ apiUrl: "http://localhost:3001", wsUrl: "ws://localhost:3001", env: "test" }),
}))

jest.mock("@/hooks/useUserSelection", () => ({
  useUserSelection: jest.fn(() => mockUseUserSelection),
}))

// Mock the store
let mockStoreState: any = {
  board: { notes: [], users: [], setNotes: jest.fn(), setUsers: jest.fn() },
  focus: { isFocus: false, currentUser: "", setIsFocus: jest.fn(), setCurrentUser: jest.fn() },
  ui: { selectedUserId: 1, hoveredColumn: null, setHoveredColumn: jest.fn(), setSelectedUserId: jest.fn() },
}

jest.mock("@/store", () => ({
  useAppStore: (selector: any) => selector(mockStoreState),
  selectNotes: (state: any) => state.board.notes,
  selectUsers: (state: any) => state.board.users,
  selectIsFocus: (state: any) => state.focus.isFocus,
  selectCurrentUser: (state: any) => state.focus.currentUser,
}))

// Mock child components for screen-level testing
jest.mock("@/components/Board", () => ({
  Board: ({ isEditable }: any) => <div data-testid="board" data-editable={isEditable} />,
}))

jest.mock("@/components/UserSelector", () => ({
  UserSelector: ({ users, selectedUser, onChange }: any) => (
    <select
      data-testid="user-selector"
      value={selectedUser}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Select user"
    >
      {users.map((user: User) => (
        <option key={user.id} value={user.id.toString()}>
          {user.name}
        </option>
      ))}
    </select>
  ),
}))

jest.mock("@/components/BoardActionMenu", () => ({
  BoardActionsMenu: ({
    anchorEl,
    openMenu,
    onClose,
    onStartFocus,
    onOpenEndStatusModal,
    onOpenAddNewNoteModal,
  }: any) => (
    <div data-testid="board-actions-menu" data-anchor-present={!!anchorEl} data-open={openMenu}>
      <button onClick={onStartFocus}>Start Focus</button>
      <button onClick={onOpenEndStatusModal}>End Status</button>
      <button onClick={onOpenAddNewNoteModal}>Add New Note</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}))

jest.mock("@/components/AddNewNoteModal", () => ({
  AddNewNoteModal: ({ isOpen, onClose }: any) => (
    <div data-testid="add-new-note-modal" data-open={isOpen}>
      <button onClick={onClose}>Close Modal</button>
    </div>
  ),
}))

jest.mock("@/components/EndStatusModal", () => ({
  EndStatusModal: ({ isOpen, notes, onClose, accessToken }: any) => (
    <div
      data-testid="end-status-modal"
      data-open={isOpen}
      data-notes-count={notes.length}
      data-has-token={!!accessToken}
    >
      <button onClick={onClose}>Close Modal</button>
    </div>
  ),
}))

jest.mock("@/components/FocusControls", () => ({
  FocusControls: ({ onPrevUser, onNextUser, onEndFocus, isFocus }: any) => (
    <div data-testid="focus-controls" data-focus={isFocus}>
      <button onClick={onPrevUser}>Previous User</button>
      <button onClick={onNextUser}>Next User</button>
      <button onClick={onEndFocus}>End Focus</button>
    </div>
  ),
}))

jest.mock("@/components/AddUserMarkModal", () => ({
  AddUserMarkModal: ({ isOpen, onClose }: any) => (
    <div data-testid="add-user-mark-modal" data-open={isOpen}>
      <button onClick={onClose}>Close Modal</button>
    </div>
  ),
}))

describe("BoardScreen", () => {
  const mockUsers: User[] = [
    { id: 1, index: 1, name: "John Doe", color: "#ff0000", email: "John Doe@example.com", marks: [] },
    { id: 2, index: 2, name: "Jane Smith", color: "#00ff00", email: "Jane Smith@example.com", marks: [] },
    { id: 3, index: 3, name: "Bob Johnson", color: "#0000ff", email: "Bob Johnson@example.com", marks: [] },
  ]

  const mockNotes: Note[] = [
    {
      id: 1,
      text: "Test note 1",
      state: "todo",
      owner_id: 1,
      name: "John Doe",
      color: "#ff0000",
      predecessor_id: null,
      updated: "2024-01-01T10:00:00Z",
      created: "2024-01-01T10:00:00Z",
      tag: null,
    },
    {
      id: 2,
      text: "Test note 2",
      state: "in_progress",
      owner_id: 2,
      name: "Jane Smith",
      color: "#00ff00",
      predecessor_id: null,
      updated: "2024-01-01T11:00:00Z",
      created: "2024-01-01T11:00:00Z",
      tag: "Important",
    },
  ]

  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()

    // Reset mock implementations to defaults
    mockUseBoardModalManagement.isEndStatusModalOpen = false
    mockUseBoardModalManagement.isAddNewNoteModalOpen = false
    mockUseBoardModalManagement.anchorEl = null
    mockUseBoardModalManagement.openMenu = false
    mockUseBoardModalManagement.isAnyModalOpen = false

    mockUseFocusManagement.isFocus = false
    mockUseFocusManagement.shouldRenderFocus = false

    mockUseUserSelection.user = "1"

    // Reset store state
    mockStoreState = {
      board: { notes: mockNotes, users: mockUsers, setNotes: jest.fn(), setUsers: jest.fn() },
      focus: { isFocus: false, currentUser: "", setIsFocus: jest.fn(), setCurrentUser: jest.fn() },
      ui: { selectedUserId: 1, hoveredColumn: null, setHoveredColumn: jest.fn(), setSelectedUserId: jest.fn() },
    }
  })

  const renderBoardScreen = (accessToken?: string) => {
    return render(<BoardScreen accessToken={accessToken} />)
  }

  describe("Basic Rendering", () => {
    it("renders board screen with all required elements", () => {
      renderBoardScreen()

      expect(screen.getByRole("heading", { name: "Board" })).toBeInTheDocument()
      expect(screen.getByTestId("user-selector")).toBeInTheDocument()
      expect(screen.getByTestId("board")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Board actions" })).toBeInTheDocument()
    })

    it("renders Board component", () => {
      renderBoardScreen("test-token")

      const board = screen.getByTestId("board")
      expect(board).toBeInTheDocument()
      expect(board).toHaveAttribute("data-editable", "true")
    })

    it("renders desktop button group on larger screens", () => {
      renderBoardScreen()

      expect(screen.getByRole("button", { name: "Create a new note" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Start focus" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "End status" })).toBeInTheDocument()
    })
  })

  describe("User Selection", () => {
    it("renders user selector with correct users", () => {
      renderBoardScreen()

      const userSelector = screen.getByTestId("user-selector")
      expect(userSelector).toHaveValue("1")

      // Check if all users are available as options
      expect(screen.getByRole("option", { name: "John Doe" })).toBeInTheDocument()
      expect(screen.getByRole("option", { name: "Jane Smith" })).toBeInTheDocument()
      expect(screen.getByRole("option", { name: "Bob Johnson" })).toBeInTheDocument()
    })

    it("handles user selection changes", async () => {
      renderBoardScreen()

      const userSelector = screen.getByTestId("user-selector")
      await user.selectOptions(userSelector, "2")

      expect(mockUseUserSelection.handleChange).toHaveBeenCalledWith("2")
    })

    it("updates current user in store when user selection changes", () => {
      // Test the useEffect that syncs user selection with store
      mockUseUserSelection.user = "2"
      renderBoardScreen()

      expect(mockStoreState.focus.setCurrentUser).toHaveBeenCalledWith("Jane Smith")
    })

    it("handles empty users array without calling setCurrentUser", () => {
      // Test the useEffect branch when users.length === 0
      mockUseUserSelection.user = "1"
      mockStoreState.board.users = []
      render(<BoardScreen />)

      expect(mockStoreState.focus.setCurrentUser).not.toHaveBeenCalled()
    })

    it("handles selected user not found in users array", () => {
      // Test the useEffect branch when selectedUser is undefined
      mockUseUserSelection.user = "999" // ID not in mockUsers
      renderBoardScreen()

      // Should not call setCurrentUser when user is not found
      expect(mockStoreState.focus.setCurrentUser).not.toHaveBeenCalled()
    })
  })

  describe("Modal Management", () => {
    it("opens add new note modal when desktop button is clicked", async () => {
      renderBoardScreen()

      const addNoteButton = screen.getByRole("button", { name: "Create a new note" })
      await user.click(addNoteButton)

      expect(mockUseBoardModalManagement.handleOpenAddNewNoteModal).toHaveBeenCalled()
    })

    it("opens end status modal when desktop button is clicked", async () => {
      renderBoardScreen()

      const endStatusButton = screen.getByRole("button", { name: "End status" })
      await user.click(endStatusButton)

      expect(mockUseBoardModalManagement.handleOpenEndStatusModal).toHaveBeenCalled()
    })

    it("opens board actions menu when mobile button is clicked", async () => {
      renderBoardScreen()

      const boardActionsButton = screen.getByRole("button", { name: "Board actions" })
      await user.click(boardActionsButton)

      expect(mockUseBoardModalManagement.handleOpenMenu).toHaveBeenCalled()
    })

    it("renders AddNewNoteModal with correct props", () => {
      mockUseBoardModalManagement.isAddNewNoteModalOpen = true
      renderBoardScreen()

      const modal = screen.getByTestId("add-new-note-modal")
      expect(modal).toHaveAttribute("data-open", "true")
    })

    it("renders EndStatusModal with correct props", () => {
      mockUseBoardModalManagement.isEndStatusModalOpen = true
      renderBoardScreen("test-access-token")

      const modal = screen.getByTestId("end-status-modal")
      expect(modal).toHaveAttribute("data-open", "true")
      expect(modal).toHaveAttribute("data-notes-count", "2")
      expect(modal).toHaveAttribute("data-has-token", "true")
    })

    it("renders board when modal is open", () => {
      mockUseBoardModalManagement.isAnyModalOpen = true
      renderBoardScreen()

      const board = screen.getByTestId("board")
      expect(board).toBeInTheDocument()
    })
  })

  describe("Focus Mode", () => {
    it("starts focus mode when desktop button is clicked", async () => {
      renderBoardScreen()

      const startFocusButton = screen.getByRole("button", { name: "Start focus" })
      await user.click(startFocusButton)

      expect(mockUseFocusManagement.handleStartFocus).toHaveBeenCalled()
    })

    it("disables start focus button when already in focus mode", () => {
      mockUseFocusManagement.isFocus = true
      renderBoardScreen()

      const startFocusButton = screen.getByRole("button", { name: "Start focus" })
      expect(startFocusButton).toBeDisabled()
    })

    it("renders board in focus mode", () => {
      mockUseFocusManagement.isFocus = true
      renderBoardScreen()

      const board = screen.getByTestId("board")
      expect(board).toBeInTheDocument()
      // Focus mode is active
      expect(mockUseFocusManagement.isFocus).toBe(true)
    })

    it("renders focus controls when shouldRenderFocus is true", () => {
      mockUseFocusManagement.shouldRenderFocus = true
      mockUseFocusManagement.isFocus = true
      renderBoardScreen()

      const focusControls = screen.getByTestId("focus-controls")
      expect(focusControls).toBeInTheDocument()
      expect(focusControls).toHaveAttribute("data-focus", "true")
    })

    it("does not render focus controls when shouldRenderFocus is false", () => {
      mockUseFocusManagement.shouldRenderFocus = false
      renderBoardScreen()

      expect(screen.queryByTestId("focus-controls")).not.toBeInTheDocument()
    })
  })

  describe("Keyboard Shortcuts", () => {
    it("sets up focus toggle hotkey", () => {
      renderBoardScreen()

      const { useHotkeys } = require("react-hotkeys-hook")
      // Find the focus toggle hotkey setup
      const focusHotkeyCall = useHotkeys.mock.calls.find((call: any[]) => call[0] === "f")
      expect(focusHotkeyCall).toBeDefined()
      expect(focusHotkeyCall[2]).toEqual([
        mockUseFocusManagement.isFocus,
        mockUseFocusManagement.handleStartFocus,
        mockUseFocusManagement.handleEndFocus,
      ])
    })

    it("sets up previous user hotkey", () => {
      renderBoardScreen()

      const { useHotkeys } = require("react-hotkeys-hook")
      // Find the previous user hotkey setup
      const prevUserHotkeyCall = useHotkeys.mock.calls.find((call: any[]) => call[0] === "a")
      expect(prevUserHotkeyCall).toBeDefined()
      expect(prevUserHotkeyCall[2]).toEqual([mockUseUserSelection.handlePrevUser])
    })

    it("sets up next user hotkey", () => {
      renderBoardScreen()

      const { useHotkeys } = require("react-hotkeys-hook")
      // Find the next user hotkey setup
      const nextUserHotkeyCall = useHotkeys.mock.calls.find((call: any[]) => call[0] === "d")
      expect(nextUserHotkeyCall).toBeDefined()
      expect(nextUserHotkeyCall[2]).toEqual([mockUseUserSelection.handleNextUser])
    })

    it("executes focus toggle callback with proper conditional logic", () => {
      // Test when not in focus mode - callback should call handleStartFocus
      mockUseFocusManagement.isFocus = false
      renderBoardScreen()

      const { useHotkeys } = require("react-hotkeys-hook")
      const focusHotkeyCall = useHotkeys.mock.calls.find((call: any[]) => call[0] === "f")
      const callback = focusHotkeyCall[1]

      callback()
      expect(mockUseFocusManagement.handleStartFocus).toHaveBeenCalled()
      expect(mockUseFocusManagement.handleEndFocus).not.toHaveBeenCalled()
    })

    it("executes focus toggle callback when in focus mode", () => {
      // Test when in focus mode - callback should call handleEndFocus
      mockUseFocusManagement.isFocus = true
      renderBoardScreen()

      const { useHotkeys } = require("react-hotkeys-hook")
      const focusHotkeyCall = useHotkeys.mock.calls.find((call: any[]) => call[0] === "f")
      const callback = focusHotkeyCall[1]

      callback()
      expect(mockUseFocusManagement.handleEndFocus).toHaveBeenCalled()
      expect(mockUseFocusManagement.handleStartFocus).not.toHaveBeenCalled()
    })
  })

  describe("Data Transformation", () => {
    it("transforms notes to snapshot format for EndStatusModal", () => {
      mockUseBoardModalManagement.isEndStatusModalOpen = true
      renderBoardScreen("token")

      // The component should transform notes to snapshot format
      // We can't directly test the useMemo, but we can verify the modal receives the data
      const modal = screen.getByTestId("end-status-modal")
      expect(modal).toHaveAttribute("data-notes-count", "2")
    })

    it("handles notes with tags and without predecessor_id", () => {
      renderBoardScreen()

      // Verify the component renders without errors when notes have various structures
      expect(screen.getByTestId("board")).toBeInTheDocument()
    })
  })

  describe("Responsive Design", () => {
    it("shows mobile board actions button", () => {
      renderBoardScreen()

      const mobileButton = screen.getByRole("button", { name: "Board actions" })
      expect(mobileButton).toBeInTheDocument()
    })

    it("shows desktop button group", () => {
      renderBoardScreen()

      expect(screen.getByRole("button", { name: "Create a new note" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Start focus" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "End status" })).toBeInTheDocument()
    })
  })
})
