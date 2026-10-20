import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ReleaseStepsForm } from "../ReleaseStepsForm"

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({ data: { accessToken: "mock-access-token" } })),
}))

jest.mock("@/app/api/fetches", () => ({
  fetchReleaseSteps: jest.fn(),
  updateReleaseSteps: jest.fn(),
}))

jest.mock("@/context/ConfigProvider", () => ({
  useConfig: () => ({ apiUrl: "http://localhost:3001", wsUrl: "ws://localhost:3001", env: "test" }),
}))

describe("ReleaseStepsForm", () => {
  const user = userEvent.setup()

  const renderForm = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    return render(
      <QueryClientProvider client={queryClient}>
        <ReleaseStepsForm />
      </QueryClientProvider>,
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()
    const { fetchReleaseSteps, updateReleaseSteps } = require("@/app/api/fetches")
    fetchReleaseSteps.mockResolvedValue([
      { title: "Announce", timing: "3 days before release", release_type: null },
      { title: "Build application", timing: null, release_type: "application" },
    ])
    updateReleaseSteps.mockImplementation((_url: string, data: unknown) => Promise.resolve(data))
  })

  it("shows stored steps", async () => {
    renderForm()

    expect(await screen.findByLabelText("Step 1")).toHaveValue("Announce")
    expect(screen.getByLabelText("Step 2")).toHaveValue("Build application")
    expect(screen.getAllByLabelText("When").map((input) => (input as HTMLInputElement).value)).toEqual([
      "3 days before release",
      "",
    ])
    expect(screen.getByRole("button", { name: "Move step 1 up" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Move step 2 down" })).toBeDisabled()
  })

  it("adds, reorders and removes steps, then saves", async () => {
    const { updateReleaseSteps } = require("@/app/api/fetches")

    renderForm()
    await screen.findByLabelText("Step 1")

    await user.click(screen.getByRole("button", { name: "Add step" }))
    await user.type(screen.getByLabelText("Step 3"), " Migrate{Enter}- logs ")
    await user.type(screen.getAllByLabelText("When")[2], " Day 0 ")
    await user.click(within(screen.getAllByRole("combobox")[2]).getByText("All types"))
    await user.click(await screen.findByRole("option", { name: "Maintenance" }))

    await user.click(screen.getByRole("button", { name: "Move step 3 up" }))
    await user.click(screen.getByRole("button", { name: "Remove step 1" }))
    // Blank rows are dropped on save
    await user.click(screen.getByRole("button", { name: "Add step" }))

    await user.click(screen.getByRole("button", { name: "Save steps" }))

    expect(await screen.findByText("Saved.")).toBeInTheDocument()
    expect(updateReleaseSteps).toHaveBeenCalledWith(
      "http://localhost:3001",
      [
        { title: "Migrate\n- logs", timing: "Day 0", release_type: "maintenance" },
        { title: "Build application", timing: null, release_type: "application" },
      ],
      "mock-access-token",
    )
  })

  it("shows a save error", async () => {
    const { updateReleaseSteps } = require("@/app/api/fetches")
    updateReleaseSteps.mockRejectedValue(new Error("There can be at most 100 steps"))

    renderForm()
    await user.click(await screen.findByRole("button", { name: "Save steps" }))

    expect(await screen.findByText("There can be at most 100 steps")).toBeInTheDocument()
  })
})
