import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ReleaseLeaderboard } from "../ReleaseLeaderboard"

describe("ReleaseLeaderboard", () => {
  const year = new Date().getFullYear()
  const releases = [
    { assignee_id: 1, assignee_name: "Alice", deployed_by_us: true, release_at: `${year}-01-10T20:00:00` },
    { assignee_id: 1, assignee_name: "Alice", deployed_by_us: false, release_at: `${year}-02-10T20:00:00` },
    { assignee_id: 2, assignee_name: "Bob", deployed_by_us: true, release_at: `${year}-03-10T20:00:00` },
    { assignee_id: 3, assignee_name: "Carol", deployed_by_us: true, release_at: `${year - 1}-03-10T20:00:00` },
  ]

  it("renders nothing without assigned releases", () => {
    const { container } = render(<ReleaseLeaderboard releases={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("shows this year's top assignees in the header", () => {
    render(<ReleaseLeaderboard releases={releases} />)

    const header = screen.getByRole("button", { name: "Release leaderboard" })
    expect(header).toHaveTextContent("🥇 Alice 2 (1)")
    expect(header).toHaveTextContent("🥈 Bob 1")
    expect(header).not.toHaveTextContent("Carol")
  })

  it("opens the full ranking and switches to all time", async () => {
    const user = userEvent.setup()
    render(<ReleaseLeaderboard releases={releases} />)

    await user.click(screen.getByRole("button", { name: "Release leaderboard" }))
    const popover = screen.getByRole("presentation")
    expect(within(popover).queryByText("Carol")).not.toBeInTheDocument()

    await user.click(within(popover).getByRole("button", { name: "All time" }))
    expect(within(popover).getByText("Carol")).toBeInTheDocument()
  })
})
