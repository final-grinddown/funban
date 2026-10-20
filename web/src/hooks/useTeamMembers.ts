import { useQuery } from "@tanstack/react-query"
import { Session } from "next-auth"
import { useSession } from "next-auth/react"
import { fetchUsers } from "@/app/api/fetches"
import { useConfig } from "@/context/ConfigProvider"

/**
 * Loads team members over REST, for pages that don't have the board WebSocket connection
 */
export function useTeamMembers() {
  const { apiUrl } = useConfig()
  const { data: session } = useSession() as { data: Session }

  return useQuery({
    queryKey: ["users"],
    queryFn: () => fetchUsers(apiUrl, session?.accessToken),
    enabled: !!session?.accessToken,
  })
}
