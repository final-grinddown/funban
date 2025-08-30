import { clearApp } from "@/app/api/auth/clearApp"

type FetchMethod = "GET" | "POST" | "PUT" | "DELETE"

interface FetchOptions {
	method?: FetchMethod
	body?: any
	headers?: Record<string, string>
}

export async function fetchWithAuth<T>(url: string, accessToken?: string, options: FetchOptions = {}): Promise<T> {
	if (!accessToken) {
		throw new Error("No access token available")
	}

	const { method = "GET", body, headers = {} } = options

	const response = await fetch(url, {
		method,
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
			...headers,
		},
		body: body ? JSON.stringify(body) : undefined,
	})

	if (response.status === 401) {
		clearApp()
	} else if (response.status === 400) {
		const error = await response.json()
		console.error(error)
		return Promise.reject(error);
	} else if (response.status === 403) {
		throw new Error("Forbidden: You do not have access to this resource.")
	} else if (response.status === 404) {
		throw new Error("Not Found: The requested resource could not be found.")
	} else if (response.status === 500) {
		throw new Error("Internal Server Error: Please try again later.")
	} else if (!response.ok) {
		throw new Error("An unexpected error occurred. Please try again later.")
	}

	return response.json()
}
