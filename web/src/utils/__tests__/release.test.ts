import { buildReleaseLeaderboard } from "../release"

type LeaderboardRelease = Parameters<typeof buildReleaseLeaderboard>[0][number]

function release(
  assigneeId: number | null,
  releaseAt: string,
  overrides: Partial<LeaderboardRelease> = {},
): LeaderboardRelease {
  return {
    assignee_id: assigneeId,
    assignee_name: assigneeId === null ? null : `User ${assigneeId}`,
    deployed_by_us: true,
    release_at: releaseAt,
    ...overrides,
  }
}

describe("buildReleaseLeaderboard", () => {
  it("counts assigned releases and only-overseen ones per assignee", () => {
    const entries = buildReleaseLeaderboard(
      [
        release(1, "2026-01-10T20:00:00"),
        release(1, "2026-02-10T20:00:00", { deployed_by_us: false }),
        release(2, "2026-03-10T20:00:00"),
      ],
      null,
    )

    expect(entries).toEqual([
      { assigneeId: 1, name: "User 1", rank: 1, total: 2, overseen: 1, lastReleaseAt: "2026-02-10T20:00:00" },
      { assigneeId: 2, name: "User 2", rank: 2, total: 1, overseen: 0, lastReleaseAt: "2026-03-10T20:00:00" },
    ])
  })

  it("leaves out unassigned releases and former members", () => {
    const entries = buildReleaseLeaderboard(
      [release(null, "2026-01-10T20:00:00"), release(null, "2026-01-11T20:00:00", { assignee_name: "Charlie" })],
      null,
    )

    expect(entries).toEqual([])
  })

  it("counts only the given year", () => {
    const releases = [release(1, "2025-12-31T23:00:00"), release(1, "2026-01-01T00:00:00")]

    expect(buildReleaseLeaderboard(releases, 2026)[0].total).toBe(1)
    expect(buildReleaseLeaderboard(releases, 2024)).toEqual([])
    expect(buildReleaseLeaderboard(releases, null)[0].total).toBe(2)
  })

  it("shares the rank on ties and orders them by the most recent release", () => {
    const entries = buildReleaseLeaderboard(
      [
        release(1, "2026-01-10T20:00:00"),
        release(2, "2026-05-10T20:00:00"),
        release(3, "2026-02-10T20:00:00"),
        release(3, "2026-03-10T20:00:00"),
      ],
      null,
    )

    expect(entries.map((entry) => [entry.assigneeId, entry.rank])).toEqual([
      [3, 1],
      [2, 2],
      [1, 2],
    ])
  })
})
