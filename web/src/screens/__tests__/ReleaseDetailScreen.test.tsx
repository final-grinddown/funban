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
  updateReleaseNotes: jest.fn(),
  updateReleaseTask: jest.fn(),
  addReleaseTasksFromTemplate: jest.fn(),
  fetchUsers: jest.fn(),
  fetchReleaseSettings: jest.fn(),
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
    notes: null,
    tasks: [],
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
    const { fetchRelease, fetchUsers, fetchReleaseSettings } = require("@/app/api/fetches")
    fetchRelease.mockResolvedValue(mockRelease)
    fetchUsers.mockResolvedValue(mockUsers)
    fetchReleaseSettings.mockResolvedValue({ notification_to: ["team@example.com"], notification_cc: [] })
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

  it("prepares notifications from the release", async () => {
    renderScreen()

    expect(await screen.findByRole("heading", { name: "Notifications" })).toBeInTheDocument()
    expect(screen.getByText(/@MaintenanceFrom DATETIME = '2026-10-20 14:00:00'/)).toBeInTheDocument()
    expect(
      screen.getByText("Planned maintenance on Oct 20 from 13:30 to 19:00 - technical release without any changes in AEQ"),
    ).toBeInTheDocument()
    expect(await screen.findByText("team@example.com")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open in mail client" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^mailto:team@example\.com\?subject=/),
    )
  })

  it("updates notifications when a parameter changes", async () => {
    renderScreen()

    const duration = await screen.findByLabelText("Duration (min)")
    await user.clear(duration)
    await user.type(duration, "60")

    expect(screen.getByText(/@DurationInMinutes INT = 60,/)).toBeInTheDocument()
    expect(screen.getByText(/from 13:30 to 15:00/)).toBeInTheDocument()

    await user.clear(duration)
    expect(screen.getByText("Fix the parameters above to generate the notifications.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Copy SQL" })).toBeDisabled()

    await user.click(screen.getByRole("button", { name: "Reset to defaults" }))
    expect(screen.getByText(/@DurationInMinutes INT = 300,/)).toBeInTheDocument()
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

  describe("Notes", () => {
    it("shows a placeholder when there are no notes", async () => {
      renderScreen()

      expect(await screen.findByRole("heading", { name: "Notes" })).toBeInTheDocument()
      expect(screen.getByText("No notes yet.")).toBeInTheDocument()
    })

    it("edits and saves the notes", async () => {
      const { updateReleaseNotes } = require("@/app/api/fetches")
      updateReleaseNotes.mockResolvedValue({ ...mockRelease, notes: "Run **migrations** first" })

      renderScreen()
      await user.click(await screen.findByRole("button", { name: "Edit notes" }))
      await user.type(screen.getByLabelText("Notes"), "Run **migrations** first")
      await user.click(screen.getByRole("button", { name: "Save" }))

      await waitFor(() => {
        expect(updateReleaseNotes).toHaveBeenCalledWith(
          "http://localhost:3001",
          7,
          "Run **migrations** first",
          "mock-access-token",
        )
      })
      expect(await screen.findByText("Run **migrations** first")).toBeInTheDocument()
      expect(screen.queryByLabelText("Notes")).not.toBeInTheDocument()
    })

    it("discards changes on cancel", async () => {
      const { fetchRelease, updateReleaseNotes } = require("@/app/api/fetches")
      fetchRelease.mockResolvedValue({ ...mockRelease, notes: "Original" })

      renderScreen()
      await user.click(await screen.findByRole("button", { name: "Edit notes" }))
      expect(screen.getByLabelText("Notes")).toHaveValue("Original")
      await user.type(screen.getByLabelText("Notes"), " changed")
      await user.click(screen.getByRole("button", { name: "Cancel" }))

      expect(screen.getByText("Original")).toBeInTheDocument()
      expect(updateReleaseNotes).not.toHaveBeenCalled()
    })

    it("keeps the editor open with an error when saving fails", async () => {
      const { updateReleaseNotes } = require("@/app/api/fetches")
      updateReleaseNotes.mockRejectedValue(new Error("Release is closed. Reopen it to make changes."))

      renderScreen()
      await user.click(await screen.findByRole("button", { name: "Edit notes" }))
      await user.type(screen.getByLabelText("Notes"), "Draft")
      await user.click(screen.getByRole("button", { name: "Save" }))

      expect(await screen.findByText("Release is closed. Reopen it to make changes.")).toBeInTheDocument()
      expect(screen.getByLabelText("Notes")).toHaveValue("Draft")
    })

    it("shows notes of a closed release without editing", async () => {
      const { fetchRelease } = require("@/app/api/fetches")
      fetchRelease.mockResolvedValue({ ...mockRelease, closed_at: "2026-10-21T09:15:00", notes: "Went fine" })

      renderScreen()

      expect(await screen.findByText("Went fine")).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "Edit notes" })).not.toBeInTheDocument()
    })
  })

  describe("Steps", () => {
    const releaseWithTasks: Release = {
      ...mockRelease,
      tasks: [
        { id: 11, title: "Announce the release", done_at: "2026-10-20T13:05:00" },
        { id: 12, title: "Deploy", done_at: null },
      ],
    }

    it("shows the steps with progress", async () => {
      const { fetchRelease } = require("@/app/api/fetches")
      fetchRelease.mockResolvedValue(releaseWithTasks)

      renderScreen()

      expect(await screen.findByRole("heading", { name: "Steps" })).toBeInTheDocument()
      expect(screen.getByText("1 / 2 done")).toBeInTheDocument()
      expect(screen.getByRole("checkbox", { name: "Announce the release" })).toBeChecked()
      expect(screen.getByText("Done 20 Oct 2026, 13:05")).toBeInTheDocument()
      expect(screen.getByRole("checkbox", { name: "Deploy" })).not.toBeChecked()
    })

    it("ticks a step off", async () => {
      const { fetchRelease, updateReleaseTask } = require("@/app/api/fetches")
      fetchRelease.mockResolvedValue(releaseWithTasks)
      updateReleaseTask.mockResolvedValue({
        ...releaseWithTasks,
        tasks: releaseWithTasks.tasks.map((task) => ({ ...task, done_at: "2026-10-20T14:10:00" })),
      })

      renderScreen()
      await user.click(await screen.findByRole("checkbox", { name: "Deploy" }))

      await waitFor(() => {
        expect(updateReleaseTask).toHaveBeenCalledWith("http://localhost:3001", 7, 12, true, "mock-access-token")
      })
      expect(await screen.findByText("2 / 2 done")).toBeInTheDocument()
      expect(screen.getByRole("checkbox", { name: "Deploy" })).toBeChecked()
    })

    it("unticks a step and shows errors", async () => {
      const { fetchRelease, updateReleaseTask } = require("@/app/api/fetches")
      fetchRelease.mockResolvedValue(releaseWithTasks)
      updateReleaseTask.mockRejectedValue(new Error("Release is closed. Reopen it to make changes."))

      renderScreen()
      await user.click(await screen.findByRole("checkbox", { name: "Announce the release" }))

      expect(updateReleaseTask).toHaveBeenCalledWith("http://localhost:3001", 7, 11, false, "mock-access-token")
      expect(await screen.findByText("Release is closed. Reopen it to make changes.")).toBeInTheDocument()
      expect(screen.getByRole("checkbox", { name: "Announce the release" })).toBeChecked()
    })

    it("adds steps from the template to a release without steps", async () => {
      const { addReleaseTasksFromTemplate } = require("@/app/api/fetches")
      addReleaseTasksFromTemplate.mockResolvedValue(releaseWithTasks)

      renderScreen()
      expect(await screen.findByText("This release has no steps yet.")).toBeInTheDocument()
      await user.click(screen.getByRole("button", { name: "Add steps from template" }))

      expect(addReleaseTasksFromTemplate).toHaveBeenCalledWith("http://localhost:3001", 7, "mock-access-token")
      expect(await screen.findByRole("checkbox", { name: "Deploy" })).toBeInTheDocument()
    })

    it("points to settings when the template is empty", async () => {
      const { addReleaseTasksFromTemplate } = require("@/app/api/fetches")
      addReleaseTasksFromTemplate.mockResolvedValue(mockRelease)

      renderScreen()
      await user.click(await screen.findByRole("button", { name: "Add steps from template" }))

      expect(await screen.findByRole("link", { name: "Settings › Releases" })).toHaveAttribute(
        "href",
        "/settings#releases",
      )
    })

    it("shows steps of a closed release without ticking", async () => {
      const { fetchRelease } = require("@/app/api/fetches")
      fetchRelease.mockResolvedValue({ ...releaseWithTasks, closed_at: "2026-10-21T09:15:00" })

      renderScreen()

      expect(await screen.findByRole("checkbox", { name: "Deploy" })).toBeDisabled()
    })

    it("hides the section for a closed release without steps", async () => {
      const { fetchRelease } = require("@/app/api/fetches")
      fetchRelease.mockResolvedValue({ ...mockRelease, closed_at: "2026-10-21T09:15:00" })

      renderScreen()

      expect(await screen.findByRole("button", { name: "Reopen" })).toBeInTheDocument()
      expect(screen.queryByRole("heading", { name: "Steps" })).not.toBeInTheDocument()
    })

    it("warns about unfinished steps when closing", async () => {
      const { fetchRelease } = require("@/app/api/fetches")
      fetchRelease.mockResolvedValue(releaseWithTasks)

      renderScreen()
      await user.click(await screen.findByRole("button", { name: "Close" }))

      const dialog = await screen.findByRole("dialog")
      expect(within(dialog).getByText("1 step is not done yet.")).toBeInTheDocument()
      expect(within(dialog).getByRole("button", { name: "Close" })).toBeEnabled()
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
      expect(screen.queryByRole("heading", { name: "Notifications" })).not.toBeInTheDocument()
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
