import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { Release } from "@/utils/interfaces"
import type { NotificationTemplate } from "@/utils/releaseNotifications"
import { ReleaseNotifications } from "../ReleaseNotifications"

const mockTemplates: { application: NotificationTemplate[]; maintenance: NotificationTemplate[] } = {
  application: [],
  maintenance: [],
}

jest.mock("@/utils/releaseNotificationTemplates", () => ({
  get notificationTemplates() {
    return mockTemplates
  },
}))

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({ data: { accessToken: "mock-access-token" } })),
}))

jest.mock("@/context/ConfigProvider", () => ({
  useConfig: () => ({ apiUrl: "http://localhost:3001", wsUrl: "ws://localhost:3001", env: "test" }),
}))

jest.mock("@/app/api/fetches", () => ({
  fetchReleaseSettings: jest.fn(() => Promise.resolve({ notification_to: [], notification_cc: [] })),
}))

describe("ReleaseNotifications", () => {
  beforeEach(() => {
    mockTemplates.application = []
    mockTemplates.maintenance = []
  })

  const release: Release = {
    id: 7,
    release_code: "20261020",
    release_type: "application",
    release_at: "2026-10-20T14:00:00",
    deployed_by_us: true,
    assignee_id: null,
    assignee_name: null,
    closed_at: null,
    close_summary: null,
    notes: null,
    tasks: [],
    created_at: "2026-10-01T10:00:00",
    updated_at: "2026-10-01T10:00:00",
  }

  const renderNotifications = () =>
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ReleaseNotifications release={release} />
      </QueryClientProvider>,
    )

  it("shows nothing for a release type without templates", () => {
    const { container } = renderNotifications()

    expect(container).toBeEmptyDOMElement()
  })

  it("shows only the inputs the templates need", () => {
    mockTemplates.application = [{ kind: "text", name: "Teams message", body: "Starting at {{start.time}}" }]

    renderNotifications()

    expect(screen.getByRole("heading", { name: "Notifications" })).toBeInTheDocument()
    expect(screen.getByLabelText("Start")).toHaveValue("2026-10-20T14:00")
    expect(screen.queryByLabelText("Duration (min)")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Title EN")).not.toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Teams message" })).toBeInTheDocument()
    expect(screen.getByText("Starting at 14:00")).toBeInTheDocument()
  })
})
