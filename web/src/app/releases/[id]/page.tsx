import { ReleaseDetailPageClient } from "./ReleaseDetailPageClient"

export default async function ReleaseItem({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return <ReleaseDetailPageClient id={id} />
}
