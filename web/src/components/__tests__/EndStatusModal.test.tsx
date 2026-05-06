import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { IRawNote } from "@/utils/interfaces"
import { EndStatusModal } from "../EndStatusModal"

jest.mock("@/context/ConfigProvider", () => ({
  useConfig: () => ({ apiUrl: "http://localhost:3001", wsUrl: "ws://localhost:3001", env: "test" }),
}))

// Mock the postSnapshot API function
jest.mock("@/app/api/fetches", () => ({
  postSnapshot: jest.fn(),
}))

const mockNotes: IRawNote[] = [
  {
    id: "1",
    text: "Test note 1",
    state: "todo",
    owner: { id: "1", name: "Test User 1", color: "#000000" },
    predecessor_id: null,
    tag: null,
    created: "2023-01-01T00:00:00Z",
    updated: "2023-01-01T00:00:00Z",
  },
  {
    id: "2",
    text: "Test note 2",
    state: "done",
    owner: { id: "2", name: "Test User 2", color: "#000000" },
    predecessor_id: null,
    tag: null,
    created: "2023-01-01T01:00:00Z",
    updated: "2023-01-01T01:00:00Z",
  },
]

const defaultProps = {
  notes: mockNotes,
  isOpen: true,
  onClose: jest.fn(),
  accessToken: "test-token",
}

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  TestWrapper.displayName = "TestWrapper"
  return TestWrapper
}

describe("EndStatusModal", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // Basic Rendering & Modal Behavior (4 tests)
  describe("Basic rendering and modal behavior", () => {
    it("renders modal when open", async () => {
      const Wrapper = createWrapper()
      render(<EndStatusModal {...defaultProps} />, { wrapper: Wrapper })

      // Wait for form initialization
      await act(async () => {})

      expect(screen.getByText("Enter Snapshot Label")).toBeInTheDocument()
      expect(screen.getByLabelText("Snapshot Label")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument()
    })

    it("does not render modal when closed", async () => {
      const Wrapper = createWrapper()
      render(<EndStatusModal {...defaultProps} isOpen={false} />, { wrapper: Wrapper })

      // Wait for form initialization
      await act(async () => {})

      expect(screen.queryByText("Enter Snapshot Label")).not.toBeInTheDocument()
    })

    it("closes modal when close button is clicked", async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      const Wrapper = createWrapper()

      render(<EndStatusModal {...defaultProps} onClose={onClose} />, { wrapper: Wrapper })

      // Wait for form initialization
      await act(async () => {})

      const closeButton = screen.getByTestId("CloseIcon").closest("button")
      expect(closeButton).toBeInTheDocument()

      await user.click(closeButton!)

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it("closes modal when cancel button is clicked", async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      const Wrapper = createWrapper()

      render(<EndStatusModal {...defaultProps} onClose={onClose} />, { wrapper: Wrapper })

      // Wait for form initialization
      await act(async () => {})

      const cancelButton = screen.getByRole("button", { name: "Cancel" })
      await user.click(cancelButton)

      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  // Form Field & Validation (6 tests)
  describe("Form field and validation", () => {
    it("auto-focuses the label input field", async () => {
      const Wrapper = createWrapper()
      render(<EndStatusModal {...defaultProps} />, { wrapper: Wrapper })

      // Wait for form initialization
      await act(async () => {})

      const labelInput = screen.getByLabelText("Snapshot Label")
      expect(labelInput).toHaveFocus()
    })

    it("allows typing in the label field", async () => {
      const user = userEvent.setup()
      const Wrapper = createWrapper()

      render(<EndStatusModal {...defaultProps} />, { wrapper: Wrapper })

      // Wait for form initialization
      await act(async () => {})

      const labelInput = screen.getByLabelText("Snapshot Label")
      await user.type(labelInput, "Test snapshot label")

      expect(labelInput).toHaveValue("Test snapshot label")
    })

    it("disables send button when label is empty", async () => {
      const Wrapper = createWrapper()

      render(<EndStatusModal {...defaultProps} />, { wrapper: Wrapper })

      // Wait for form initialization
      await act(async () => {})

      const sendButton = screen.getByRole("button", { name: "Send" })

      // Should be disabled because field is empty
      expect(sendButton).toBeDisabled()
    })

    it("shows error when label exceeds 40 characters", async () => {
      const user = userEvent.setup()
      const Wrapper = createWrapper()

      render(<EndStatusModal {...defaultProps} />, { wrapper: Wrapper })

      // Wait for form initialization
      await act(async () => {})

      const longLabel = "a".repeat(41)
      const labelInput = screen.getByLabelText("Snapshot Label")

      await user.type(labelInput, longLabel)

      await waitFor(() => {
        expect(screen.getByText("Label cannot exceed 40 characters.")).toBeInTheDocument()
      })
    })

    it("shows error when label starts with space", async () => {
      const user = userEvent.setup()
      const Wrapper = createWrapper()

      render(<EndStatusModal {...defaultProps} />, { wrapper: Wrapper })

      // Wait for form initialization
      await act(async () => {})

      const labelInput = screen.getByLabelText("Snapshot Label")

      await user.type(labelInput, " invalid label")

      await waitFor(() => {
        expect(screen.getByText("Label cannot start with a space.")).toBeInTheDocument()
      })
    })

    it("enables send button when label is valid", async () => {
      const user = userEvent.setup()
      const Wrapper = createWrapper()

      render(<EndStatusModal {...defaultProps} />, { wrapper: Wrapper })

      // Wait for form initialization
      await act(async () => {})

      const labelInput = screen.getByLabelText("Snapshot Label")
      await user.type(labelInput, "Valid label")

      await waitFor(() => {
        const sendButton = screen.getByRole("button", { name: "Send" })
        expect(sendButton).toBeEnabled()
      })
    })
  })

  // Form Submission & API Integration (4 tests)
  describe("Form submission and API integration", () => {
    it("calls postSnapshot API with correct data on form submission", async () => {
      const user = userEvent.setup()
      const { postSnapshot } = require("@/app/api/fetches")
      postSnapshot.mockResolvedValueOnce(undefined)

      const Wrapper = createWrapper()
      render(<EndStatusModal {...defaultProps} />, { wrapper: Wrapper })

      // Wait for form initialization
      await act(async () => {})

      const labelInput = screen.getByLabelText("Snapshot Label")
      await user.type(labelInput, "My snapshot")

      const sendButton = screen.getByRole("button", { name: "Send" })
      await user.click(sendButton)

      expect(postSnapshot).toHaveBeenCalledWith(
        "http://localhost:3001",
        { label: "My snapshot", notes: mockNotes },
        "test-token",
      )

      // Wait for the mutation to settle so onSuccess state updates are wrapped in act
      await waitFor(() => expect(defaultProps.onClose).toHaveBeenCalled())
    })

    it("shows loading state during submission", async () => {
      const user = userEvent.setup()
      const { postSnapshot } = require("@/app/api/fetches")
      // Create a promise that we can control
      let resolvePromise: () => void
      postSnapshot.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolvePromise = resolve
          }),
      )

      const Wrapper = createWrapper()
      render(<EndStatusModal {...defaultProps} />, { wrapper: Wrapper })

      // Wait for form initialization
      await act(async () => {})

      const labelInput = screen.getByLabelText("Snapshot Label")
      await user.type(labelInput, "Loading test")

      const sendButton = screen.getByRole("button", { name: "Send" })
      await user.click(sendButton)

      await waitFor(() => {
        expect(screen.getByRole("progressbar")).toBeInTheDocument()
        expect(sendButton).toBeDisabled()
      })

      // Resolve and drain the mutation's onSuccess state updates
      resolvePromise!()
      await waitFor(() => expect(defaultProps.onClose).toHaveBeenCalled())
    })

    it("shows success snackbar and closes modal on successful submission", async () => {
      const user = userEvent.setup()
      const { postSnapshot } = require("@/app/api/fetches")
      postSnapshot.mockResolvedValueOnce(undefined)

      const onClose = jest.fn()
      const Wrapper = createWrapper()

      render(<EndStatusModal {...defaultProps} onClose={onClose} />, { wrapper: Wrapper })

      // Wait for form initialization
      await act(async () => {})

      const labelInput = screen.getByLabelText("Snapshot Label")
      await user.type(labelInput, "Success test")

      const sendButton = screen.getByRole("button", { name: "Send" })
      await user.click(sendButton)

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1)
        expect(screen.getByText("Snapshot sent successfully!")).toBeInTheDocument()
      })
    })

    it("shows error snackbar and closes modal on failed submission", async () => {
      const user = userEvent.setup()
      const { postSnapshot } = require("@/app/api/fetches")
      const errorMessage = "API Error occurred"
      postSnapshot.mockRejectedValueOnce(new Error(errorMessage))

      const onClose = jest.fn()
      const Wrapper = createWrapper()

      render(<EndStatusModal {...defaultProps} onClose={onClose} />, { wrapper: Wrapper })

      // Wait for form initialization
      await act(async () => {})

      const labelInput = screen.getByLabelText("Snapshot Label")
      await user.type(labelInput, "Error test")

      const sendButton = screen.getByRole("button", { name: "Send" })
      await user.click(sendButton)

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1)
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
    })
  })

  // Snackbar Behavior (2 tests)
  describe("Snackbar behavior", () => {
    it("shows success snackbar after submission", async () => {
      const user = userEvent.setup()
      const { postSnapshot } = require("@/app/api/fetches")
      postSnapshot.mockResolvedValueOnce(undefined)

      const Wrapper = createWrapper()
      render(<EndStatusModal {...defaultProps} />, { wrapper: Wrapper })

      // Wait for form initialization
      await act(async () => {})

      const labelInput = screen.getByLabelText("Snapshot Label")
      await user.type(labelInput, "Snackbar test")

      const sendButton = screen.getByRole("button", { name: "Send" })
      await user.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText("Snapshot sent successfully!")).toBeInTheDocument()
      })

      // Verify the snackbar has correct styling
      const successMessage = screen.getByText("Snapshot sent successfully!")
      const alert = successMessage.closest(".MuiAlert-root")
      expect(alert).toHaveClass("MuiAlert-filledSuccess")
    })

    it("handles error snackbar with generic message when no error message provided", async () => {
      const user = userEvent.setup()
      const { postSnapshot } = require("@/app/api/fetches")
      postSnapshot.mockRejectedValueOnce(new Error())

      const Wrapper = createWrapper()
      render(<EndStatusModal {...defaultProps} />, { wrapper: Wrapper })

      // Wait for form initialization
      await act(async () => {})

      const labelInput = screen.getByLabelText("Snapshot Label")
      await user.type(labelInput, "Generic error test")

      const sendButton = screen.getByRole("button", { name: "Send" })
      await user.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText("Failed to send snapshot")).toBeInTheDocument()
      })
    })
  })

  // Form Reset & Props Handling (3 tests)
  describe("Form reset and props handling", () => {
    it("resets form when modal closes and reopens", async () => {
      const user = userEvent.setup()
      const Wrapper = createWrapper()

      const { rerender } = render(<EndStatusModal {...defaultProps} />, { wrapper: Wrapper })

      // Wait for form initialization
      await act(async () => {})

      const labelInput = screen.getByLabelText("Snapshot Label")
      await user.type(labelInput, "Test content")
      expect(labelInput).toHaveValue("Test content")

      // Close modal
      rerender(<EndStatusModal {...defaultProps} isOpen={false} />)

      // Wait for form initialization
      await act(async () => {})

      // Reopen modal
      rerender(<EndStatusModal {...defaultProps} />)

      // Wait for form initialization
      await act(async () => {})

      await waitFor(() => {
        const newLabelInput = screen.getByLabelText("Snapshot Label")
        expect(newLabelInput).toHaveValue("")
      })
    })

    it("works without access token", async () => {
      const user = userEvent.setup()
      const { postSnapshot } = require("@/app/api/fetches")
      postSnapshot.mockResolvedValueOnce(undefined)

      const Wrapper = createWrapper()
      render(<EndStatusModal {...defaultProps} accessToken={undefined} />, { wrapper: Wrapper })

      // Wait for form initialization
      await act(async () => {})

      const labelInput = screen.getByLabelText("Snapshot Label")
      await user.type(labelInput, "No token test")

      const sendButton = screen.getByRole("button", { name: "Send" })
      await user.click(sendButton)

      expect(postSnapshot).toHaveBeenCalledWith(
        "http://localhost:3001",
        { label: "No token test", notes: mockNotes },
        undefined,
      )

      // Wait for the mutation to settle so onSuccess state updates are wrapped in act
      await waitFor(() => expect(defaultProps.onClose).toHaveBeenCalled())
    })

    it("handles empty notes array", async () => {
      const Wrapper = createWrapper()
      render(<EndStatusModal {...defaultProps} notes={[]} />, { wrapper: Wrapper })

      // Wait for form initialization
      await act(async () => {})

      expect(screen.getByText("Enter Snapshot Label")).toBeInTheDocument()
      expect(screen.getByLabelText("Snapshot Label")).toBeInTheDocument()
    })
  })
})
