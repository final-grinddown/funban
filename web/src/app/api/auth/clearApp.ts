import { signOut } from "next-auth/react"
import { removeStoredUserEmail } from "@/utils/storage"
import { client } from "../client"

export function clearApp() {
  signOut()
  removeStoredUserEmail()
  client.clear()
}
