import { HistoryV1 } from "./v1/HistoryV1"
import { HistoryV2 } from "./v2/HistoryV2"

interface HistoryRendererProps {
  snapshot: string
  version: number
}

export function HistoryRenderer({ snapshot, version }: HistoryRendererProps) {
  switch (version) {
    case 1:
      return <HistoryV1 snapshot={snapshot} />
    case 2:
      return <HistoryV2 snapshot={snapshot} />
    default:
      throw new Error(`Unsupported snapshot version: ${version}`)
  }
}