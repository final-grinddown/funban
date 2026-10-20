import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AppError } from "@/utils/errorHandler"
import { Release } from "@/utils/interfaces"
import { ReleasesScreen } from "../ReleasesScreen"

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
  fetchReleases: jest.fn(),
  fetchRelease: jest.fn(),
  createRelease: jest.fn(),
  fetchUsers: jest.fn(),
}))

jest.mock("@/components/BackdropLoading", () => ({
  BackdropLoading: ({ isInDashboard }: { isInDashboard: boolean }) => (
    <div data-testid="backdrop-loading" data-in-dashboard={isInDashboard}>
      Loading...
    </div>
  ),
}))

jest.mock("@/context/ConfigProvider", () => ({
  useConfig: () => ({ apiUrl: "http://localhost:3001", wsUrl: "ws://localhost:3001", env: "test" }),
}))

describe("ReleasesScreen", () => {
  const mockReleases: Release[] = [
    {
      id: 1,
      release_code: "20261020",
      release_type: "application",
      release_at: "2026-10-20T14:00:00",
      assignee_id: 1,
      assignee_name: "Alice",
      closed_at: null,
      close_summary: null,
      created_at: "2026-10-01T10:00:00",
      updated_at: "2026-10-01T10:00:00",
    },
    {
      id: 2,
      release_code: "20260901",
      release_type: "maintenance",
      release_at: "2026-09-01T08:30:00",
      assignee_id: null,
      assignee_name: "Charlie",
      closed_at: "2026-09-02T09:00:00",
      close_summary: "No problems during the release. Done.",
      created_at: "2026-08-01T10:00:00",
      updated_at: "2026-08-01T10:00:00",
    },
  ]

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
        <ReleasesScreen />
      </QueryClientProvider>,
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()
    const { fetchReleases, fetchRelease, fetchUsers } = require("@/app/api/fetches")
    fetchReleases.mockResolvedValue(mockReleases)
    fetchRelease.mockResolvedValue(mockReleases[0])
    fetchUsers.mockResolvedValue(mockUsers)
  })

  it("shows loading state initially", () => {
    renderScreen()

    expect(screen.getByTestId("backdrop-loading")).toHaveAttribute("data-in-dashboard", "true")
  })

  it("renders releases in the table", async () => {
    renderScreen()

    await waitFor(() => {
      expect(screen.getByRole("table")).toBeInTheDocument()
    })

    expect(screen.getByRole("heading", { name: "Releases" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Code" })).toBeInTheDocument()
    expect(screen.getByText("20261020")).toBeInTheDocument()
    expect(screen.getByText("Application")).toBeInTheDocument()
    expect(screen.getByText("Maintenance")).toBeInTheDocument()
    expect(screen.getByText("20 Oct 2026, 14:00")).toBeInTheDocument()
  })

  it("marks assignees who left the team", async () => {
    renderScreen()

    await waitFor(() => {
      expect(screen.getByRole("table")).toBeInTheDocument()
    })

    const formerRow = screen.getByText("20260901").closest("tr") as HTMLElement
    expect(within(formerRow).getByText(/Charlie/)).toBeInTheDocument()
    expect(within(formerRow).getByText("(former member)")).toBeInTheDocument()

    const activeRow = screen.getByText("20261020").closest("tr") as HTMLElement
    expect(within(activeRow).queryByText("(former member)")).not.toBeInTheDocument()
  })

  it("shows the open/closed status of each release", async () => {
    renderScreen()

    await waitFor(() => {
      expect(screen.getByRole("table")).toBeInTheDocument()
    })

    const openRow = screen.getByText("20261020").closest("tr") as HTMLElement
    expect(within(openRow).getByText("Open")).toBeInTheDocument()
    const closedRow = screen.getByText("20260901").closest("tr") as HTMLElement
    expect(within(closedRow).getByText("Closed")).toBeInTheDocument()
  })

  it("navigates to the detail page on row click", async () => {
    renderScreen()

    await waitFor(() => {
      expect(screen.getByRole("table")).toBeInTheDocument()
    })

    await user.click(screen.getByText("20261020"))

    expect(mockPush).toHaveBeenCalledWith("/releases/1")
  })

  it("shows an empty state when there are no releases", async () => {
    const { fetchReleases } = require("@/app/api/fetches")
    fetchReleases.mockResolvedValue([])

    renderScreen()

    await waitFor(() => {
      expect(screen.getByText(/No releases yet/)).toBeInTheDocument()
    })
  })

  it("displays an error when fetching fails", async () => {
    const { fetchReleases } = require("@/app/api/fetches")
    fetchReleases.mockRejectedValue(new Error("Failed to fetch releases"))

    renderScreen()

    await waitFor(() => {
      expect(screen.getByText("Failed to fetch releases")).toBeInTheDocument()
    })
  })

  describe("Creating a release", () => {
    const fillForm = async () => {
      await user.click(screen.getByRole("button", { name: "New release" }))
      const dialog = await screen.findByRole("dialog")

      await user.type(within(dialog).getByLabelText("Release code"), "20261105")
      fireEvent.change(within(dialog).getByLabelText("Date & time"), { target: { value: "2026-11-05T09:00" } })

      fireEvent.mouseDown(within(dialog).getByLabelText("Assigned developer"))
      await user.click(await screen.findByRole("option", { name: "Bob" }))

      return dialog
    }

    it("submits the form with the entered values", async () => {
      const { createRelease } = require("@/app/api/fetches")
      createRelease.mockResolvedValue({ ...mockReleases[0], id: 3, release_code: "20261105" })

      renderScreen()
      await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument())

      const dialog = await fillForm()
      const submit = within(dialog).getByRole("button", { name: "Create" })
      await waitFor(() => expect(submit).toBeEnabled())
      await user.click(submit)

      await waitFor(() => {
        expect(createRelease).toHaveBeenCalledWith(
          "http://localhost:3001",
          {
            release_code: "20261105",
            release_type: "application",
            release_at: "2026-11-05T09:00",
            assignee_id: 2,
          },
          "mock-access-token",
        )
      })
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    })

    it("keeps the modal open and shows the server error on conflict", async () => {
      const { createRelease } = require("@/app/api/fetches")
      createRelease.mockRejectedValue(new AppError("Release code already exists", "CONFLICT", 409))

      renderScreen()
      await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument())

      const dialog = await fillForm()
      const submit = within(dialog).getByRole("button", { name: "Create" })
      await waitFor(() => expect(submit).toBeEnabled())
      await user.click(submit)

      expect(await within(dialog).findByText("Release code already exists")).toBeInTheDocument()
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })
  })
})
