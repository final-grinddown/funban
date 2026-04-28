import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DeleteNoteBulkModal } from "../DeleteNoteBulkModal"

// Mock WebSocket context
const mockWebSocketContext = {
  sendMessageAsync: jest.fn().mockResolvedValue(undefined),
  isLoading: false,
  users: [],
  isConnected: true,
}

jest.mock("@/context/WebSocketProvider", () => ({
  useWebSocketContext: () => mockWebSocketContext,
}))

// Mock websocket functions
jest.mock("@/app/api/websocket", () => ({
  createDeleteNoteBulk: jest.fn().mockReturnValue("mock-bulk-delete-message"),
  createDeleteNoteUserBulk: jest.fn().mockReturnValue("mock-user-bulk-delete-message"),
}))

const defaultProps = {
  isOpen: true,
  userName: "John Doe",
  userId: 1,
  state: "todo" as const,
  isFocus: false,
  onClose: jest.fn(),
}

describe("DeleteNoteBulkModal", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWebSocketContext.isLoading = false
    mockWebSocketContext.sendMessageAsync = jest.fn().mockResolvedValue(undefined)
  })

  // Basic Rendering (4 tests)
  describe("Basic rendering", () => {
    it("renders modal when open", () => {
      render(<DeleteNoteBulkModal {...defaultProps} />)

      expect(screen.getByText("Delete Note")).toBeInTheDocument()
      expect(screen.getByText(/Are you sure you want to delete all notes in state 'todo'/)).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument()
    })

    it("does not render modal when closed", () => {
      render(<DeleteNoteBulkModal {...defaultProps} isOpen={false} />)

      expect(screen.queryByText("Delete Note")).not.toBeInTheDocument()
    })

    it("displays different states correctly", () => {
      const { rerender } = render(<DeleteNoteBulkModal {...defaultProps} state="in_progress" />)

      expect(screen.getByText(/Are you sure you want to delete all notes in state 'in_progress'/)).toBeInTheDocument()

      rerender(<DeleteNoteBulkModal {...defaultProps} state="done" />)
      expect(screen.getByText(/Are you sure you want to delete all notes in state 'done'/)).toBeInTheDocument()
    })

    it("shows correct user name in message", () => {
      render(<DeleteNoteBulkModal {...defaultProps} userName="Jane Smith" isFocus={true} />)

      expect(screen.getByText(/for user 'Jane Smith'/)).toBeInTheDocument()
    })
  })

  // Focus vs Non-Focus Mode (4 tests)
  describe("Focus vs non-focus mode", () => {
    it("shows user-specific message when in focus mode", () => {
      render(<DeleteNoteBulkModal {...defaultProps} isFocus={true} />)

      expect(screen.getByText(/delete all notes in state 'todo' for user 'John Doe'/)).toBeInTheDocument()
    })

    it("shows all-users message when not in focus mode", () => {
      render(<DeleteNoteBulkModal {...defaultProps} isFocus={false} />)

      expect(screen.getByText(/delete all notes in state 'todo' for ALL users/)).toBeInTheDocument()
    })

    it("calls correct WebSocket function for focus mode", async () => {
      const user = userEvent.setup()
      const { createDeleteNoteUserBulk } = require("@/app/api/websocket")

      render(<DeleteNoteBulkModal {...defaultProps} isFocus={true} />)

      const deleteButton = screen.getByRole("button", { name: "Delete" })
      await user.click(deleteButton)

      expect(createDeleteNoteUserBulk).toHaveBeenCalledWith("todo", 1)
      expect(mockWebSocketContext.sendMessageAsync).toHaveBeenCalledWith(
        "mock-user-bulk-delete-message",
        "Notes deleted successfully!",
      )
    })

    it("calls correct WebSocket function for non-focus mode", async () => {
      const user = userEvent.setup()
      const { createDeleteNoteBulk } = require("@/app/api/websocket")

      render(<DeleteNoteBulkModal {...defaultProps} isFocus={false} />)

      const deleteButton = screen.getByRole("button", { name: "Delete" })
      await user.click(deleteButton)

      expect(createDeleteNoteBulk).toHaveBeenCalledWith("todo")
      expect(mockWebSocketContext.sendMessageAsync).toHaveBeenCalledWith(
        "mock-bulk-delete-message",
        "Notes deleted successfully!",
      )
    })
  })

  // Button Interactions (3 tests)
  describe("Button interactions", () => {
    it("calls onClose when close icon is clicked", async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()

      render(<DeleteNoteBulkModal {...defaultProps} onClose={onClose} />)

      const closeButton = screen.getByTestId("CloseIcon").closest("button")
      expect(closeButton).toBeInTheDocument()

      await user.click(closeButton!)

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it("calls onClose when cancel button is clicked", async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()

      render(<DeleteNoteBulkModal {...defaultProps} onClose={onClose} />)

      const cancelButton = screen.getByRole("button", { name: "Cancel" })
      await user.click(cancelButton)

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it("handles delete button click and calls WebSocket", async () => {
      const user = userEvent.setup()

      render(<DeleteNoteBulkModal {...defaultProps} />)

      const deleteButton = screen.getByRole("button", { name: "Delete" })
      await user.click(deleteButton)

      // Verify the core functionality: WebSocket is called with correct parameters
      expect(mockWebSocketContext.sendMessageAsync).toHaveBeenCalledTimes(1)
      expect(mockWebSocketContext.sendMessageAsync).toHaveBeenCalledWith(
        "mock-bulk-delete-message",
        "Notes deleted successfully!",
      )
    })
  })

  // Loading and Submission States (4 tests)
  describe("Loading and submission states", () => {
    it("shows loading state when WebSocket is loading", async () => {
      const user = userEvent.setup()

      // Set WebSocket to loading state before the click
      mockWebSocketContext.isLoading = true

      render(<DeleteNoteBulkModal {...defaultProps} />)

      const deleteButton = screen.getByRole("button", { name: "Delete" })
      await user.click(deleteButton)

      // When isLoading=true, component should show loading state
      await waitFor(() => {
        expect(screen.getByRole("progressbar")).toBeInTheDocument()
      })

      // Button should be disabled during loading
      expect(deleteButton).toBeDisabled()
    })

    it("closes modal after successful deletion in focus mode", async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()

      const { rerender } = render(<DeleteNoteBulkModal {...defaultProps} onClose={onClose} isFocus={true} />)

      const deleteButton = screen.getByRole("button", { name: "Delete" })
      await user.click(deleteButton)

      // Simulate WebSocket operation starting (isLoading becomes true)
      mockWebSocketContext.isLoading = true
      rerender(<DeleteNoteBulkModal {...defaultProps} onClose={onClose} isFocus={true} />)

      // Simulate WebSocket operation completing (isLoading becomes false)
      mockWebSocketContext.isLoading = false
      rerender(<DeleteNoteBulkModal {...defaultProps} onClose={onClose} isFocus={true} />)

      // Component should close modal when isSubmitting=true and isLoading=false
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled()
      })
    })

    it("closes modal after successful deletion in non-focus mode", async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()

      const { rerender } = render(<DeleteNoteBulkModal {...defaultProps} onClose={onClose} isFocus={false} />)

      const deleteButton = screen.getByRole("button", { name: "Delete" })
      await user.click(deleteButton)

      // Simulate WebSocket operation starting (isLoading becomes true)
      mockWebSocketContext.isLoading = true
      rerender(<DeleteNoteBulkModal {...defaultProps} onClose={onClose} isFocus={false} />)

      // Simulate WebSocket operation completing (isLoading becomes false)
      mockWebSocketContext.isLoading = false
      rerender(<DeleteNoteBulkModal {...defaultProps} onClose={onClose} isFocus={false} />)

      // Component should close modal when isSubmitting=true and isLoading=false
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled()
      })
    })

    it("maintains submitting state while WebSocket is loading", async () => {
      const user = userEvent.setup()
      mockWebSocketContext.isLoading = true

      render(<DeleteNoteBulkModal {...defaultProps} />)

      const deleteButton = screen.getByRole("button", { name: "Delete" })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByRole("progressbar")).toBeInTheDocument()
      })
    })

    it("shows delete text when not submitting", () => {
      render(<DeleteNoteBulkModal {...defaultProps} />)

      const deleteButton = screen.getByRole("button", { name: "Delete" })
      expect(deleteButton).toBeEnabled()
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument()
    })
  })

  // Edge Cases (3 tests)
  describe("Edge cases", () => {
    it("handles different user IDs correctly", async () => {
      const user = userEvent.setup()
      const { createDeleteNoteUserBulk } = require("@/app/api/websocket")

      render(<DeleteNoteBulkModal {...defaultProps} userId={42} isFocus={true} />)

      const deleteButton = screen.getByRole("button", { name: "Delete" })
      await user.click(deleteButton)

      expect(createDeleteNoteUserBulk).toHaveBeenCalledWith("todo", 42)
    })

    it("handles empty user name gracefully", () => {
      render(<DeleteNoteBulkModal {...defaultProps} userName="" isFocus={true} />)

      expect(screen.getByText(/for user ''/)).toBeInTheDocument()
    })

    it("disables delete button while submission is in progress", async () => {
      const user = userEvent.setup()

      // Make the mock loading state true to simulate WebSocket being in progress
      mockWebSocketContext.isLoading = true

      render(<DeleteNoteBulkModal {...defaultProps} />)

      const deleteButton = screen.getByRole("button", { name: "Delete" })

      // Button should be enabled initially
      expect(deleteButton).toBeEnabled()

      // Click the button
      await user.click(deleteButton)

      // Check that the button shows loading state (CircularProgress)
      await waitFor(() => {
        expect(screen.getByRole("progressbar")).toBeInTheDocument()
      })

      // Button should be disabled while loading
      expect(deleteButton).toBeDisabled()
    })
  })
})
