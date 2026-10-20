import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { User } from "@/utils/interfaces"
import { SettingsScreen } from "../SettingsScreen"

// Mock Next.js router
const mockPush = jest.fn()
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock child components to focus on SettingsScreen logic
jest.mock("@/components/AccountSettings", () => ({
  AccountSettings: () => <div data-testid="account-settings">Account Settings Content</div>,
}))

jest.mock("@/components/TeamManagement", () => ({
  TeamManagement: ({ users }: { users: User[] }) => (
    <div data-testid="team-management">Team Management Content - {users.length} users</div>
  ),
}))

jest.mock("@/components/BoardConfiguration", () => ({
  BoardConfiguration: () => <div data-testid="board-configuration">Board Configuration Content</div>,
}))

jest.mock("@/components/ReleaseSettingsForm", () => ({
  ReleaseSettingsForm: () => <div data-testid="release-settings">Release Settings Content</div>,
}))

// Mock MUI breakpoint hook
const mockUseMediaQuery = jest.fn(() => false)
jest.mock("@mui/material", () => ({
  ...jest.requireActual("@mui/material"),
  useMediaQuery: () => mockUseMediaQuery(),
  useTheme: () => ({
    palette: {
      background: { paper: "#ffffff" },
      divider: "#e0e0e0",
    },
    breakpoints: {
      down: () => "sm",
    },
  }),
}))

describe("SettingsScreen", () => {
  const mockUsers: User[] = [
    { id: 1, index: 1, name: "John Doe", color: "#ff0000", email: "John Doe@example.com", marks: [] },
    { id: 2, index: 2, name: "Jane Smith", color: "#00ff00", email: "Jane Smith@example.com", marks: [] },
    { id: 3, index: 3, name: "Bob Johnson", color: "#0000ff", email: "Bob Johnson@example.com", marks: [] },
  ]

  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseMediaQuery.mockReturnValue(false)
  })

  describe("Basic Functionality", () => {
    it("renders settings page with all required elements", async () => {
      render(<SettingsScreen users={mockUsers} />)

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument()
      })

      // All tabs should be present
      expect(screen.getByRole("tab", { name: "ACCOUNT" })).toBeInTheDocument()
      expect(screen.getByRole("tab", { name: "TEAM MANAGEMENT" })).toBeInTheDocument()
      expect(screen.getByRole("tab", { name: "BOARD CONFIGURATION" })).toBeInTheDocument()
      expect(screen.getByRole("tab", { name: "RELEASES" })).toBeInTheDocument()

      // Should have proper tablist
      expect(screen.getByRole("tablist", { name: "settings tabs" })).toBeInTheDocument()
    })

    it("passes users prop to TeamManagement component", async () => {
      render(<SettingsScreen users={mockUsers} />)

      // The TeamManagement component should receive the users prop
      // We can verify this by checking our mock component output
      await waitFor(() => {
        // Content is rendered via tabpanel, so it should be there even if not visible
        expect(screen.getByText(/Team Management Content - 3 users/)).toBeInTheDocument()
      })
    })

    it("has correct accessibility structure", async () => {
      render(<SettingsScreen users={mockUsers} />)

      await waitFor(() => {
        const tablist = screen.getByRole("tablist", { name: "settings tabs" })
        expect(tablist).toBeInTheDocument()
      })

      // Check ARIA attributes
      const accountTab = screen.getByRole("tab", { name: "ACCOUNT" })
      expect(accountTab).toHaveAttribute("aria-controls", "tabpanel-account")
      expect(accountTab).toHaveAttribute("id", "tab-account")

      const teamTab = screen.getByRole("tab", { name: "TEAM MANAGEMENT" })
      expect(teamTab).toHaveAttribute("aria-controls", "tabpanel-team-management")
    })
  })

  describe("Tab Interaction", () => {
    it("updates router when switching tabs", async () => {
      render(<SettingsScreen users={mockUsers} />)

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: "TEAM MANAGEMENT" })).toBeInTheDocument()
      })

      const teamTab = screen.getByRole("tab", { name: "TEAM MANAGEMENT" })
      await user.click(teamTab)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("#team-management", { scroll: false })
      })
    })

    it("updates router for board configuration tab", async () => {
      render(<SettingsScreen users={mockUsers} />)

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: "BOARD CONFIGURATION" })).toBeInTheDocument()
      })

      const boardTab = screen.getByRole("tab", { name: "BOARD CONFIGURATION" })
      await user.click(boardTab)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("#board-configuration", { scroll: false })
      })
    })

    it("changes selected tab when clicked", async () => {
      render(<SettingsScreen users={mockUsers} />)

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: "ACCOUNT" })).toHaveAttribute("aria-selected", "true")
      })

      const teamTab = screen.getByRole("tab", { name: "TEAM MANAGEMENT" })
      await user.click(teamTab)

      await waitFor(() => {
        expect(teamTab).toHaveAttribute("aria-selected", "true")
        expect(screen.getByRole("tab", { name: "ACCOUNT" })).toHaveAttribute("aria-selected", "false")
      })
    })
  })

  describe("Additional Tab Coverage", () => {
    it("exercises all tab indices through user interaction", async () => {
      render(<SettingsScreen users={mockUsers} />)

      // Start with account tab (index 0)
      await waitFor(() => {
        expect(screen.getByRole("tab", { name: "ACCOUNT" })).toHaveAttribute("aria-selected", "true")
      })

      // Click team management tab (index 1)
      const teamTab = screen.getByRole("tab", { name: "TEAM MANAGEMENT" })
      await user.click(teamTab)

      await waitFor(() => {
        expect(teamTab).toHaveAttribute("aria-selected", "true")
        expect(mockPush).toHaveBeenCalledWith("#team-management", { scroll: false })
      })

      // Click board configuration tab (index 2)
      const boardTab = screen.getByRole("tab", { name: "BOARD CONFIGURATION" })
      await user.click(boardTab)

      await waitFor(() => {
        expect(boardTab).toHaveAttribute("aria-selected", "true")
        expect(mockPush).toHaveBeenCalledWith("#board-configuration", { scroll: false })
      })

      // Click back to account tab to complete the cycle
      const accountTab = screen.getByRole("tab", { name: "ACCOUNT" })
      await user.click(accountTab)

      await waitFor(() => {
        expect(accountTab).toHaveAttribute("aria-selected", "true")
        expect(mockPush).toHaveBeenCalledWith("#account", { scroll: false })
      })
    })
  })

  describe("Responsive Design", () => {
    it("adapts to different screen sizes", async () => {
      mockUseMediaQuery.mockReturnValue(true) // Mobile

      render(<SettingsScreen users={mockUsers} />)

      await waitFor(() => {
        // Just verify that tabs render correctly regardless of orientation
        expect(screen.getByRole("tablist")).toBeInTheDocument()
        expect(screen.getByRole("tab", { name: "ACCOUNT" })).toBeInTheDocument()
      })
    })
  })

  describe("Component Integration", () => {
    it("renders all child components", async () => {
      render(<SettingsScreen users={mockUsers} />)

      await waitFor(() => {
        // All components should be rendered (even if not visible due to tab switching)
        expect(screen.getByTestId("account-settings")).toBeInTheDocument()
        expect(screen.getByTestId("team-management")).toBeInTheDocument()
        expect(screen.getByTestId("board-configuration")).toBeInTheDocument()
      })
    })
  })
})
