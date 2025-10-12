import { HistoryDetailPageClient } from "./HistoryDetailPageClient"

export default async function HistoryItem({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params

  return <HistoryDetailPageClient id={id} />
}
