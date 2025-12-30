import { NextResponse } from "next/server"
import { auth } from "@/auth"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isAuthenticated = !!req.auth

  // If not authenticated and trying to access protected route, redirect to sign-in
  if (!isAuthenticated) {
    const signInUrl = new URL("/sign-in", req.url)
    signInUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - / (root)
     * - /sign-in
     * - /api/auth (NextAuth API routes)
     * - /_next (Next.js internals)
     * - /favicon.ico, /robots.txt, /env.js (static files)
     */
    "/((?!$|api/auth|_next/static|_next/image|favicon.ico|robots.txt|env.js|sign-in$).+)",
  ],
}
