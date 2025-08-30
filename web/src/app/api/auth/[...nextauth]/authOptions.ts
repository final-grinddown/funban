import { NextAuthOptions, Session, User } from "next-auth"
import { AdapterUser } from "next-auth/adapters"
import { JWT } from "next-auth/jwt"
import CredentialsProvider from "next-auth/providers/credentials"
import { IExtendedJWT, IExtendedSession } from "@/utils/interfaces"

const API_URL = process.env.NEXT_PUBLIC_API_URL

export const authOptions: NextAuthOptions = {
	session: {
		strategy: "jwt",
	},
	pages: {
		signIn: "/sign-in",
		signOut: "/sign-in",
		error: "/sign-in",
	},
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
						return data
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
	callbacks: {
		async jwt({ token, user }: { token: JWT; user?: User | AdapterUser }): Promise<JWT> {
			if (user && "token" in user) {
				token.accessToken = user.token
			}

			return token
		},
		async session({ session, token }: { session: IExtendedSession; token: IExtendedJWT }): Promise<Session> {
			session.accessToken = token.accessToken

			if (!session.user) {
				session.user = {}
			}

			if (token.accessToken) {
				try {
					const res = await fetch(`${API_URL}/auth/me`, {
						method: "GET",
						headers: {
							Authorization: `Bearer ${token.accessToken}`,
						},
					})

					if (res.ok) {
						const userData = await res.json()
						session.user.email = userData.email
						session.user.name = userData.username
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
}
