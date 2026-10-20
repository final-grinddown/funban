import { useQuery } from "@tanstack/react-query"
import { Session } from "next-auth"
import { useSession } from "next-auth/react"
import { fetchReleaseSteps } from "@/app/api/fetches"
import { useConfig } from "@/context/ConfigProvider"

export const releaseStepsQueryKey = ["releaseSteps"]

/**
 * Loads the team-wide release step template
 */
export function useReleaseSteps() {
  const { apiUrl } = useConfig()
  const { data: session } = useSession() as { data: Session }

  return useQuery({
    queryKey: releaseStepsQueryKey,
    queryFn: () => fetchReleaseSteps(apiUrl, session?.accessToken),
    enabled: !!session?.accessToken,
  })
}
