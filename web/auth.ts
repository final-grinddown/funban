import NextAuth from "next-auth"
import "next-auth/jwt"
import CredentialsProvider from "next-auth/providers/credentials"

const API_URL = process.env.NEXT_PUBLIC_API_URL

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: {
          label: "Email",
          type: "text",
          placeholder: "you@example.com",
        },
        password: {
          label: "Password",
          type: "password",
          placeholder: "Your password",
        },
      },
      authorize: async (credentials) => {
        try {
          const res = await fetch(`${API_URL}/auth/signin`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: credentials?.username,
              password: credentials?.password,
            }),
          })

          const data = await res.json()

          if (res.ok && data) {
            return {
              id: data.id || data.user_id,
              email: data.email,
              name: data.username,
              token: data.token,
            }
          } else {
            return null
          }
        } catch (error) {
          console.error("Error during authentication:", error)
          return null
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/sign-in",
    signOut: "/sign-in",
    error: "/sign-in",
  },
  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user && "token" in user) {
        token.accessToken = user.token
      }
      return token
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token.accessToken) {
        session.accessToken = token.accessToken

        try {
          const res = await fetch(`${API_URL}/auth/me`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token.accessToken}`,
            },
          })

          if (res.ok) {
            const userData = await res.json()
            session.user = {
              ...session.user,
              email: userData.email,
              name: userData.username,
            }
          } else {
            console.error("Failed to fetch user details:", res.statusText)
          }
        } catch (error) {
          console.error("Error fetching user details:", error)
        }
      }

      return session
    },
  },
})