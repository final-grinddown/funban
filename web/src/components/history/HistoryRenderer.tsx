import { getSnapshotVersion } from "@/utils/snapshot-types"
import { HistoryV1 } from "./v1/HistoryV1"

interface HistoryRendererProps {
  snapshot: string
}

export function HistoryRenderer({ snapshot }: HistoryRendererProps) {
  const version = getSnapshotVersion(snapshot)

  switch (version) {
    case 1:
      return <HistoryV1 snapshot={snapshot} />
    // case 2:
    //   return <HistoryV2 snapshot={snapshot} />
    default:
      throw new Error(`Unsupported snapshot version: ${version}`)
  }
}