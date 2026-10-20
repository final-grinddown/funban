import { Suspense } from "react"
import { BackdropLoading } from "@/components/BackdropLoading"
import { SignInScreen } from "@/screens/SignInScreen"

export default function SignIn() {
  return (
    <Suspense fallback={<BackdropLoading />}>
      <SignInScreen />
    </Suspense>
  )
}
