import NextAuth from "next-auth"
import "next-auth/jwt"
import CredentialsProvider from "next-auth/providers/credentials"
import { ENV } from "@/utils/env"

const API_URL = ENV.API_URL

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
      // On sign in, store user data in token
      if (user) {
        return {
          ...token,
          accessToken: user.token,
          sub: user.id,
          email: user.email,
          name: user.name,
        }
      }

      // Return existing token on subsequent calls
      return token
    },
    async session({ session, token }: { session: any; token: any }) {
      // Pass token data to session
      return {
        ...session,
        accessToken: token.accessToken,
        user: {
          id: token.sub,
          email: token.email,
          name: token.name,
        },
      }
    },
  },
})
