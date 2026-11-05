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

  /** Checkboxes of the "Applies to" group of the step at the index */
  const typesOf = (index: number) => within(screen.getAllByRole("group", { name: "Applies to" })[index])

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
      { title: "Announce", timing: "3 days before release", release_types: [] },
      { title: "Build application", timing: null, release_types: ["application"] },
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

    // A step for every type has all boxes checked
    expect(typesOf(0).getByLabelText("All")).toBeChecked()
    expect(typesOf(0).getByLabelText("Hotfix")).toBeChecked()
    // A step for one type shows All as partial and keeps its only type
    expect(typesOf(1).getByLabelText("All")).not.toBeChecked()
    expect(typesOf(1).getByLabelText("All")).toHaveAttribute("data-indeterminate", "true")
    expect(typesOf(1).getByLabelText("Application")).toBeChecked()
    expect(typesOf(1).getByLabelText("Application")).toBeDisabled()
    expect(typesOf(1).getByLabelText("Hotfix")).not.toBeChecked()
  })

  it("targets several types and collapses back to All", async () => {
    const { updateReleaseSteps } = require("@/app/api/fetches")

    renderForm()
    await screen.findByLabelText("Step 1")

    // Everything except hotfix
    await user.click(typesOf(0).getByLabelText("Hotfix"))
    expect(typesOf(0).getByLabelText("All")).not.toBeChecked()
    expect(typesOf(0).getByLabelText("Application")).toBeChecked()

    // Adding the remaining types makes it All again
    await user.click(typesOf(1).getByLabelText("Maintenance"))
    await user.click(typesOf(1).getByLabelText("Team release"))
    await user.click(typesOf(1).getByLabelText("Hotfix"))
    expect(typesOf(1).getByLabelText("All")).toBeChecked()

    await user.click(screen.getByRole("button", { name: "Save steps" }))

    expect(await screen.findByText("Saved.")).toBeInTheDocument()
    expect(updateReleaseSteps).toHaveBeenCalledWith(
      "http://localhost:3001",
      [
        { title: "Announce", timing: "3 days before release", release_types: ["application", "maintenance", "team"] },
        { title: "Build application", timing: null, release_types: [] },
      ],
      "mock-access-token",
    )
  })

  it("resets a partial selection with All", async () => {
    renderForm()
    await screen.findByLabelText("Step 1")

    await user.click(typesOf(1).getByLabelText("All"))

    expect(typesOf(1).getByLabelText("All")).toBeChecked()
    expect(typesOf(1).getByLabelText("Maintenance")).toBeChecked()
  })

  it("adds, reorders and removes steps, then saves", async () => {
    const { updateReleaseSteps } = require("@/app/api/fetches")

    renderForm()
    await screen.findByLabelText("Step 1")

    await user.click(screen.getByRole("button", { name: "Add step" }))
    await user.type(screen.getByLabelText("Step 3"), " Migrate{Enter}- logs ")
    await user.type(screen.getAllByLabelText("When")[2], " Day 0 ")
    // Keep only maintenance
    for (const type of ["Application", "Team release", "Hotfix"]) await user.click(typesOf(2).getByLabelText(type))

    await user.click(screen.getByRole("button", { name: "Move step 3 up" }))
    await user.click(screen.getByRole("button", { name: "Remove step 1" }))
    // Blank rows are dropped on save
    await user.click(screen.getByRole("button", { name: "Add step" }))

    await user.click(screen.getByRole("button", { name: "Save steps" }))

    expect(await screen.findByText("Saved.")).toBeInTheDocument()
    expect(updateReleaseSteps).toHaveBeenCalledWith(
      "http://localhost:3001",
      [
        { title: "Migrate\n- logs", timing: "Day 0", release_types: ["maintenance"] },
        { title: "Build application", timing: null, release_types: ["application"] },
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
