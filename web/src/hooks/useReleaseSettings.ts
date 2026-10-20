import { useQuery } from "@tanstack/react-query"
import { Session } from "next-auth"
import { useSession } from "next-auth/react"
import { fetchReleaseSettings } from "@/app/api/fetches"
import { useConfig } from "@/context/ConfigProvider"

export const releaseSettingsQueryKey = ["releaseSettings"]

/**
 * Loads the team-wide release notification settings (email recipients)
 */
export function useReleaseSettings() {
  const { apiUrl } = useConfig()
  const { data: session } = useSession() as { data: Session }

  return useQuery({
    queryKey: releaseSettingsQueryKey,
    queryFn: () => fetchReleaseSettings(apiUrl, session?.accessToken),
    enabled: !!session?.accessToken,
  })
}
