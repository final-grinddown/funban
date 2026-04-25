import unTypiaNext from "@ryoppippi/unplugin-typia/next"

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/((?!_next/static|_next/image|favicon).*)",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
    ]
  },
}

export default unTypiaNext(nextConfig, {})
