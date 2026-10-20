import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Release } from "@/utils/interfaces"
import { ReleaseDetailScreen } from "../ReleaseDetailScreen"

const mockPush = jest.fn()
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

const mockSession = {
  accessToken: "mock-access-token",
  user: { email: "test@example.com" },
}

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({ data: mockSession })),
}))

jest.mock("@/app/api/fetches", () => ({
  fetchRelease: jest.fn(),
  updateRelease: jest.fn(),
  deleteRelease: jest.fn(),
  closeRelease: jest.fn(),
  reopenRelease: jest.fn(),
  fetchUsers: jest.fn(),
}))

jest.mock("@/components/BackdropLoading", () => ({
  BackdropLoading: () => <div data-testid="backdrop-loading">Loading...</div>,
}))

jest.mock("@/context/ConfigProvider", () => ({
  useConfig: () => ({ apiUrl: "http://localhost:3001", wsUrl: "ws://localhost:3001", env: "test" }),
}))

describe("ReleaseDetailScreen", () => {
  const mockRelease: Release = {
    id: 7,
    release_code: "20261020",
    release_type: "maintenance",
    release_at: "2026-10-20T14:00:00",
    assignee_id: 1,
    assignee_name: "Alice",
    closed_at: null,
    close_summary: null,
    created_at: "2026-10-01T10:00:00",
    updated_at: "2026-10-01T10:00:00",
  }

  const mockUsers = [
    { id: 1, name: "Alice", color: "#ff0000" },
    { id: 2, name: "Bob", color: "#0000ff" },
  ]

  const user = userEvent.setup()

  const renderScreen = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    return render(
      <QueryClientProvider client={queryClient}>
        <ReleaseDetailScreen id="7" />
      </QueryClientProvider>,
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()
    const { fetchRelease, fetchUsers } = require("@/app/api/fetches")
    fetchRelease.mockResolvedValue(mockRelease)
    fetchUsers.mockResolvedValue(mockUsers)
  })

  it("renders release details", async () => {
    renderScreen()

    expect(await screen.findByRole("heading", { name: "Release 20261020" })).toBeInTheDocument()
    expect(screen.getByText("Maintenance")).toBeInTheDocument()
    expect(screen.getByText("20 Oct 2026, 14:00")).toBeInTheDocument()
    expect(screen.getByText("Alice")).toBeInTheDocument()

    const { fetchRelease } = require("@/app/api/fetches")
    expect(fetchRelease).toHaveBeenCalledWith("http://localhost:3001", "7", "mock-access-token")
  })

  it("shows the name snapshot for a former team member", async () => {
    const { fetchRelease } = require("@/app/api/fetches")
    fetchRelease.mockResolvedValue({ ...mockRelease, assignee_id: null, assignee_name: "Charlie" })

    renderScreen()

    expect(await screen.findByText("(former member)")).toBeInTheDocument()
    expect(screen.getByText(/Charlie/)).toBeInTheDocument()
  })

  it("shows an unassigned release", async () => {
    const { fetchRelease } = require("@/app/api/fetches")
    fetchRelease.mockResolvedValue({ ...mockRelease, assignee_id: null, assignee_name: null })

    renderScreen()

    expect(await screen.findByText("Unassigned")).toBeInTheDocument()
    expect(screen.queryByText("(former member)")).not.toBeInTheDocument()
  })

  it("shows an error when the release cannot be loaded", async () => {
    const { fetchRelease } = require("@/app/api/fetches")
    fetchRelease.mockRejectedValue(new Error("The requested resource could not be found."))

    renderScreen()

    expect(await screen.findByText("The requested resource could not be found.")).toBeInTheDocument()
  })

  it("pre-fills the edit form and saves changes", async () => {
    const { updateRelease } = require("@/app/api/fetches")
    updateRelease.mockResolvedValue({ ...mockRelease, release_code: "20261021" })

    renderScreen()
    await user.click(await screen.findByRole("button", { name: "Edit" }))

    const dialog = await screen.findByRole("dialog")
    const codeInput = within(dialog).getByLabelText("Release code")
    expect(codeInput).toHaveValue("20261020")
    expect(within(dialog).getByLabelText("Date & time")).toHaveValue("2026-10-20T14:00")

    await user.clear(codeInput)
    await user.type(codeInput, "20261021")
    const save = within(dialog).getByRole("button", { name: "Save" })
    await waitFor(() => expect(save).toBeEnabled())
    await user.click(save)

    await waitFor(() => {
      expect(updateRelease).toHaveBeenCalledWith(
        "http://localhost:3001",
        7,
        {
          release_code: "20261021",
          release_type: "maintenance",
          release_at: "2026-10-20T14:00",
          assignee_id: 1,
        },
        "mock-access-token",
      )
    })
    expect(await screen.findByRole("heading", { name: "Release 20261021" })).toBeInTheDocument()
  })

  it("deletes the release after confirmation and returns to the list", async () => {
    const { deleteRelease } = require("@/app/api/fetches")
    deleteRelease.mockResolvedValue(undefined)

    renderScreen()
    await user.click(await screen.findByRole("button", { name: "Delete" }))

    const dialog = await screen.findByRole("dialog")
    await user.click(within(dialog).getByRole("button", { name: "Delete" }))

    await waitFor(() => {
      expect(deleteRelease).toHaveBeenCalledWith("http://localhost:3001", 7, "mock-access-token")
      expect(mockPush).toHaveBeenCalledWith("/releases")
    })
  })

  describe("Closing", () => {
    const closedRelease: Release = {
      ...mockRelease,
      closed_at: "2026-10-21T09:15:00",
      close_summary: "Hotfix needed for the login page.",
    }

    it("closes with the prefilled default summary", async () => {
      const { closeRelease } = require("@/app/api/fetches")
      closeRelease.mockResolvedValue({ ...closedRelease, close_summary: "No problems during the release. Done." })

      renderScreen()
      await user.click(await screen.findByRole("button", { name: "Close" }))

      const dialog = await screen.findByRole("dialog")
      expect(within(dialog).getByLabelText("Summary")).toHaveValue("No problems during the release. Done.")
      await user.click(within(dialog).getByRole("button", { name: "Close" }))

      await waitFor(() => {
        expect(closeRelease).toHaveBeenCalledWith(
          "http://localhost:3001",
          7,
          "No problems during the release. Done.",
          "mock-access-token",
        )
      })
      expect(await screen.findByRole("button", { name: "Reopen" })).toBeInTheDocument()
    })

    it("requires a non-empty summary", async () => {
      renderScreen()
      await user.click(await screen.findByRole("button", { name: "Close" }))

      const dialog = await screen.findByRole("dialog")
      await user.clear(within(dialog).getByLabelText("Summary"))

      await waitFor(() => {
        expect(within(dialog).getByRole("button", { name: "Close" })).toBeDisabled()
      })
    })

    it("shows a closed release as read-only with its summary", async () => {
      const { fetchRelease } = require("@/app/api/fetches")
      fetchRelease.mockResolvedValue(closedRelease)

      renderScreen()

      expect(await screen.findByText("Hotfix needed for the login page.")).toBeInTheDocument()
      expect(screen.getByText("Closed")).toBeInTheDocument()
      expect(screen.getByText("21 Oct 2026, 09:15")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Reopen" })).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument()
    })

    it("reopens a closed release", async () => {
      const { fetchRelease, reopenRelease } = require("@/app/api/fetches")
      fetchRelease.mockResolvedValue(closedRelease)
      reopenRelease.mockResolvedValue({ ...closedRelease, closed_at: null })

      renderScreen()
      await user.click(await screen.findByRole("button", { name: "Reopen" }))

      await waitFor(() => {
        expect(reopenRelease).toHaveBeenCalledWith("http://localhost:3001", 7, "mock-access-token")
      })
      expect(await screen.findByRole("button", { name: "Edit" })).toBeInTheDocument()
    })

    it("offers the previous summary when closing again after reopening", async () => {
      const { fetchRelease } = require("@/app/api/fetches")
      fetchRelease.mockResolvedValue({ ...closedRelease, closed_at: null })

      renderScreen()
      await user.click(await screen.findByRole("button", { name: "Close" }))

      const dialog = await screen.findByRole("dialog")
      expect(within(dialog).getByLabelText("Summary")).toHaveValue("Hotfix needed for the login page.")
    })
  })
})
