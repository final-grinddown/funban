export const dynamic = "force-dynamic"

// Cheap probe target for Kubernetes / uptime checks; excluded from auth in middleware.ts
export function GET() {
  return Response.json({ ok: true })
}
