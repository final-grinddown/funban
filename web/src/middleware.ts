export { default } from "next-auth/middleware"

export const config = {
  matcher: [
    "/((?!sign-in|$).*)", // Protect all routes except "/" and "/sign-in"
  ],
}
