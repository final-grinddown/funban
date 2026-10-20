import { auth } from "./auth"

export default auth((req) => {
  const isAuthenticated = !!req.auth
  const isAuthPage = req.nextUrl.pathname.startsWith("/sign-in")

  // Redirect authenticated users away from sign-in page
  if (isAuthPage && isAuthenticated) {
    return Response.redirect(new URL("/board", req.url))
  }

  // Redirect unauthenticated users to sign-in page
  if (!isAuthPage && !isAuthenticated) {
    return Response.redirect(new URL("/sign-in", req.url))
  }
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next (Next.js internals)
     * - static files
     */
    "/((?!api|_next|.*\\..*).*)",
  ],
}
