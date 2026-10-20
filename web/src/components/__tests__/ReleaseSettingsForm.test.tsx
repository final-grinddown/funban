import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { parseEmailList, ReleaseSettingsForm } from "../ReleaseSettingsForm"

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({ data: { accessToken: "mock-access-token" } })),
}))

jest.mock("@/app/api/fetches", () => ({
  fetchReleaseSettings: jest.fn(),
  updateReleaseSettings: jest.fn(),
}))

jest.mock("@/context/ConfigProvider", () => ({
  useConfig: () => ({ apiUrl: "http://localhost:3001", wsUrl: "ws://localhost:3001", env: "test" }),
}))

describe("ReleaseSettingsForm", () => {
  const user = userEvent.setup()

  const renderForm = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    return render(
      <QueryClientProvider client={queryClient}>
        <ReleaseSettingsForm />
      </QueryClientProvider>,
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()
    const { fetchReleaseSettings } = require("@/app/api/fetches")
    fetchReleaseSettings.mockResolvedValue({
      notification_to: ["team@example.com"],
      notification_cc: ["a@example.com", "b@example.com"],
    })
  })

  it("parses emails separated by lines, commas and semicolons", () => {
    expect(parseEmailList(" a@x.com\n\nb@x.com; c@x.com,d@x.com ")).toEqual(["a@x.com", "b@x.com", "c@x.com", "d@x.com"])
  })

  it("shows stored recipients and saves changes", async () => {
    const { updateReleaseSettings } = require("@/app/api/fetches")
    updateReleaseSettings.mockImplementation((_url: string, data: unknown) => Promise.resolve(data))

    renderForm()

    const cc = await screen.findByLabelText("CC")
    expect(screen.getByLabelText("To")).toHaveValue("team@example.com")
    expect(cc).toHaveValue("a@example.com\nb@example.com")

    await user.clear(cc)
    await user.type(cc, "marcel.haspl@eurowag.com")
    await user.click(screen.getByRole("button", { name: "Save" }))

    expect(await screen.findByText("Saved.")).toBeInTheDocument()
    expect(updateReleaseSettings).toHaveBeenCalledWith(
      "http://localhost:3001",
      { notification_to: ["team@example.com"], notification_cc: ["marcel.haspl@eurowag.com"] },
      "mock-access-token",
    )
  })

  it("shows a save error", async () => {
    const { updateReleaseSettings } = require("@/app/api/fetches")
    updateReleaseSettings.mockRejectedValue(new Error("notification_cc contains an invalid email: x"))

    renderForm()
    await user.click(await screen.findByRole("button", { name: "Save" }))

    expect(await screen.findByText("notification_cc contains an invalid email: x")).toBeInTheDocument()
  })
})
