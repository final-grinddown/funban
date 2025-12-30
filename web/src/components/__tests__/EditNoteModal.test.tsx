import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { EditNoteModal } from "../EditNoteModal"

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

// Mock the websocket functions
jest.mock("@/app/api/websocket", () => ({
  createUpdateNote: jest.fn().mockReturnValue("mock-update-note-message"),
  createUpdateNoteText: jest.fn().mockReturnValue("mock-update-text-message"),
  createUpdateNoteReorderLast: jest.fn().mockReturnValue("mock-reorder-last-message"),
}))

// Mock TextLengthCounter component
jest.mock("../TextLengthCounter", () => ({
  TextLengthCounter: ({ currentLength, maxLength }: any) => (
    <div data-testid="text-length-counter">
      {currentLength}/{maxLength}
    </div>
  ),
}))

const defaultProps = {
  isOpen: true,
  noteId: 123,
  noteState: "todo" as const,
  noteText: "Original note text",
  onClose: jest.fn(),
}

describe("EditNoteModal", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWebSocketContext.isLoading = false
    mockWebSocketContext.sendMessageAsync = jest.fn().mockResolvedValue(undefined)
  })

  // Basic Rendering & Modal Behavior (4 tests)
  describe("Basic rendering and modal behavior", () => {
    it("renders modal when open", async () => {
      render(<EditNoteModal {...defaultProps} />)

      // Wait for React Hook Form initialization
      await act(async () => {})

      expect(screen.getByText("Edit Note")).toBeInTheDocument()
      expect(screen.getByLabelText("State")).toBeInTheDocument()
      expect(screen.getByLabelText("Note Text")).toBeInTheDocument()
      expect(screen.getByDisplayValue("Original note text")).toBeInTheDocument()
    })

    it("does not render modal when closed", async () => {
      render(<EditNoteModal {...defaultProps} isOpen={false} />)

      // Wait for React Hook Form initialization
      await act(async () => {})

      expect(screen.queryByText("Edit Note")).not.toBeInTheDocument()
    })

    it("closes modal when close button is clicked", async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()

      render(<EditNoteModal {...defaultProps} onClose={onClose} />)

      // Wait for React Hook Form initialization
      await act(async () => {})

      const closeButton = screen.getByTestId("CloseIcon").closest("button")
      expect(closeButton).toBeInTheDocument()

      await user.click(closeButton!)

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it("closes modal when cancel button is clicked", async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()

      render(<EditNoteModal {...defaultProps} onClose={onClose} />)

      // Wait for React Hook Form initialization
      await act(async () => {})

      const cancelButton = screen.getByRole("button", { name: /cancel/i })
      await user.click(cancelButton)

      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  // Form Pre-population & Reset (3 tests)
  describe("Form pre-population and reset", () => {
    it("pre-populates form with current note values", async () => {
      render(<EditNoteModal {...defaultProps} noteState="in_progress" noteText="Test content" />)

      // Wait for React Hook Form initialization
      await act(async () => {})

      expect(screen.getByRole("combobox", { name: "State" })).toHaveTextContent("In Progress")
      expect(screen.getByDisplayValue("Test content")).toBeInTheDocument()
    })

    it("resets form when modal reopens with new values", async () => {
      const { rerender } = render(<EditNoteModal {...defaultProps} isOpen={false} />)

      // Wait for React Hook Form initialization
      await act(async () => {})

      // Reopen with different values
      rerender(<EditNoteModal {...defaultProps} noteState="done" noteText="New content" />)

      // Wait for React Hook Form initialization
      await act(async () => {})

      await waitFor(() => {
        expect(screen.getByRole("combobox", { name: "State" })).toHaveTextContent("Done")
        expect(screen.getByDisplayValue("New content")).toBeInTheDocument()
      })
    })

    it("shows text length counter when text is present", async () => {
      render(<EditNoteModal {...defaultProps} noteText="Test content" />)

      // Wait for React Hook Form initialization
      await act(async () => {})

      expect(screen.getByTestId("text-length-counter")).toBeInTheDocument()
      expect(screen.getByText("12/1000")).toBeInTheDocument()
    })
  })

  // Form Field Interactions (4 tests)
  describe("Form field interactions", () => {
    it("allows editing note text", async () => {
      const user = userEvent.setup()
      render(<EditNoteModal {...defaultProps} />)

      // Wait for React Hook Form initialization
      await act(async () => {})

      const textField = screen.getByLabelText("Note Text")
      await user.clear(textField)
      await user.type(textField, "Updated note content")

      expect(textField).toHaveValue("Updated note content")
    })

    it("allows changing note state", async () => {
      const user = userEvent.setup()
      render(<EditNoteModal {...defaultProps} />)

      // Wait for React Hook Form initialization
      await act(async () => {})

      const stateSelect = screen.getByRole("combobox", { name: "State" })
      await user.click(stateSelect)

      await waitFor(() => {
        const doneOption = screen.getByRole("option", { name: "Done" })
        expect(doneOption).toBeInTheDocument()
      })

      const doneOption = screen.getByRole("option", { name: "Done" })
      await user.click(doneOption)

      await waitFor(() => {
        expect(stateSelect).toHaveTextContent("Done")
      })
    })

    it("updates text length counter as user types", async () => {
      const user = userEvent.setup()
      render(<EditNoteModal {...defaultProps} noteText="" />)

      // Wait for React Hook Form initialization
      await act(async () => {})

      const textField = screen.getByLabelText("Note Text")
      await user.type(textField, "Hello")

      expect(screen.getByTestId("text-length-counter")).toBeInTheDocument()
      expect(screen.getByText("5/1000")).toBeInTheDocument()
    })

    it("disables save button when text exceeds max length", async () => {
      const user = userEvent.setup()
      render(<EditNoteModal {...defaultProps} />)

      // Wait for React Hook Form initialization
      await act(async () => {})

      const longText = "a".repeat(1001)
      const textField = screen.getByLabelText("Note Text")
      await user.clear(textField)
      await user.paste(longText)

      await waitFor(() => {
        const saveButton = screen.getByRole("button", { name: "Save" })
        expect(saveButton).toBeDisabled()
      })
    })
  })

  // Form Validation & Save State (3 tests)
  describe("Form validation and save state", () => {
    it("disables save button when no changes are made", async () => {
      render(<EditNoteModal {...defaultProps} />)

      // Wait for React Hook Form initialization
      await act(async () => {})

      const saveButton = screen.getByRole("button", { name: "Save" })
      expect(saveButton).toBeDisabled()
    })

    it("enables save button when text is changed", async () => {
      const user = userEvent.setup()
      render(<EditNoteModal {...defaultProps} />)

      // Wait for React Hook Form initialization
      await act(async () => {})

      const textField = screen.getByLabelText("Note Text")
      await user.type(textField, " additional text")

      await waitFor(() => {
        const saveButton = screen.getByRole("button", { name: "Save" })
        expect(saveButton).toBeEnabled()
      })
    })

    it("enables save button when state is changed", async () => {
      const user = userEvent.setup()
      render(<EditNoteModal {...defaultProps} />)

      // Wait for React Hook Form initialization
      await act(async () => {})

      const stateSelect = screen.getByRole("combobox", { name: "State" })
      await user.click(stateSelect)

      await waitFor(() => {
        const doneOption = screen.getByRole("option", { name: "Done" })
        expect(doneOption).toBeInTheDocument()
      })

      const doneOption = screen.getByRole("option", { name: "Done" })
      await user.click(doneOption)

      await waitFor(() => {
        const saveButton = screen.getByRole("button", { name: "Save" })
        expect(saveButton).toBeEnabled()
      })
    })
  })

  // Form Submission - Different Change Types (4 tests)
  describe("Form submission based on change types", () => {
    it("submits text-only change", async () => {
      const user = userEvent.setup()
      const { createUpdateNoteText } = require("@/app/api/websocket")

      render(<EditNoteModal {...defaultProps} />)

      // Wait for React Hook Form initialization
      await act(async () => {})

      const textField = screen.getByLabelText("Note Text")
      await user.clear(textField)
      await user.type(textField, "Updated text only")

      const saveButton = screen.getByRole("button", { name: "Save" })
      await user.click(saveButton)

      expect(createUpdateNoteText).toHaveBeenCalledWith("123", "Updated text only")
      expect(mockWebSocketContext.sendMessageAsync).toHaveBeenCalledWith(
        "mock-update-text-message",
        "(Id: 123) Note text updated!",
      )
    })

    it("submits state-only change", async () => {
      const user = userEvent.setup()
      const { createUpdateNoteReorderLast } = require("@/app/api/websocket")

      render(<EditNoteModal {...defaultProps} />)

      // Wait for React Hook Form initialization
      await act(async () => {})

      const stateSelect = screen.getByRole("combobox", { name: "State" })
      await user.click(stateSelect)

      await waitFor(() => {
        const doneOption = screen.getByRole("option", { name: "Done" })
        expect(doneOption).toBeInTheDocument()
      })
      const doneOption = screen.getByRole("option", { name: "Done" })
      await user.click(doneOption)

      const saveButton = screen.getByRole("button", { name: "Save" })
      await user.click(saveButton)

      expect(createUpdateNoteReorderLast).toHaveBeenCalledWith("123", "done")
      expect(mockWebSocketContext.sendMessageAsync).toHaveBeenCalledWith(
        "mock-reorder-last-message",
        "(Id: 123) Note status updated!",
      )
    })

    it("submits combined text and state change", async () => {
      const user = userEvent.setup()
      const { createUpdateNote } = require("@/app/api/websocket")

      render(<EditNoteModal {...defaultProps} />)

      // Wait for React Hook Form initialization
      await act(async () => {})

      // Change both text and state
      const textField = screen.getByLabelText("Note Text")
      await user.clear(textField)
      await user.type(textField, "Updated text and state")

      const stateSelect = screen.getByRole("combobox", { name: "State" })
      await user.click(stateSelect)

      await waitFor(() => {
        const doneOption = screen.getByRole("option", { name: "Done" })
        expect(doneOption).toBeInTheDocument()
      })
      const doneOption = screen.getByRole("option", { name: "Done" })
      await user.click(doneOption)

      const saveButton = screen.getByRole("button", { name: "Save" })
      await user.click(saveButton)

      expect(createUpdateNote).toHaveBeenCalledWith("123", "Updated text and state", "done")
      expect(mockWebSocketContext.sendMessageAsync).toHaveBeenCalledWith(
        "mock-update-note-message",
        "(Id: 123) Note text and status updated!",
      )
    })

    it("disables save button during submission", async () => {
      const user = userEvent.setup()

      render(<EditNoteModal {...defaultProps} />)

      // Wait for React Hook Form initialization
      await act(async () => {})

      const textField = screen.getByLabelText("Note Text")
      await user.type(textField, " updated")

      const saveButton = screen.getByRole("button", { name: "Save" })

      // Button should be enabled before clicking
      expect(saveButton).toBeEnabled()

      await user.click(saveButton)

      // Button should be disabled during submission
      expect(saveButton).toBeDisabled()
    })
  })

  // Focus Management & Keyboard Shortcuts (3 tests)
  describe("Focus management and keyboard shortcuts", () => {
    it("focuses and selects text when hasTextFocus is true", async () => {
      const clearTextFocus = jest.fn()

      render(<EditNoteModal {...defaultProps} hasTextFocus={true} clearTextFocus={clearTextFocus} />)

      // Wait for React Hook Form initialization
      await act(async () => {})

      await waitFor(() => {
        const textField = screen.getByLabelText("Note Text")
        expect(textField).toHaveFocus()
        expect(clearTextFocus).toHaveBeenCalledTimes(1)
      })
    })

    it("supports keyboard shortcut submission (Shift+Enter)", async () => {
      const user = userEvent.setup()
      const { createUpdateNoteText } = require("@/app/api/websocket")

      render(<EditNoteModal {...defaultProps} />)

      // Wait for React Hook Form initialization
      await act(async () => {})

      const textField = screen.getByLabelText("Note Text")
      await user.clear(textField)
      await user.type(textField, "Updated via shortcut")

      // Use keyboard shortcut
      await user.keyboard("{Shift>}{Enter}{/Shift}")

      expect(createUpdateNoteText).toHaveBeenCalledWith("123", "Updated via shortcut")
    })

    it("closes modal after successful submission", async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()

      render(<EditNoteModal {...defaultProps} onClose={onClose} />)

      // Wait for React Hook Form initialization
      await act(async () => {})

      const textField = screen.getByLabelText("Note Text")
      await user.type(textField, " updated")

      const saveButton = screen.getByRole("button", { name: "Save" })
      await user.click(saveButton)

      // Wait for submission to complete and modal to close
      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1)
      })
    })
  })
})
