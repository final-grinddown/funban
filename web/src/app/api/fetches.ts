import { fetchWithAuth } from "@/app/api/fetchWithAuth"
import { base64EncodeUnicode } from "@/utils/helpers"
import { IHistoryItem, ISnapshotData } from "@/utils/interfaces"

const API_URL = process.env.NEXT_PUBLIC_API_URL

export const fetchHistory = async (accessToken?: string): Promise<IHistoryItem[]> => {
	return fetchWithAuth<IHistoryItem[]>(`${API_URL}/history`, accessToken)
}

export const fetchHistoryItem = async (id: string, accessToken?: string): Promise<IHistoryItem> => {
	return fetchWithAuth<IHistoryItem>(`${API_URL}/history/browser/${id}`, accessToken)
}

export const fetchHistoryItemLast = async (accessToken?: string): Promise<IHistoryItem> => {
	return fetchWithAuth<IHistoryItem>(`${API_URL}/history/browser`, accessToken)
}

export const postSnapshot = async (data: ISnapshotData, accessToken?: string): Promise<void> => {
	const encodedSnapshot = base64EncodeUnicode(JSON.stringify(data.notes))

	return fetchWithAuth<void>(`${API_URL}/history`, accessToken, {
		method: "POST",
		body: {
			label: data.label,
			snapshot: encodedSnapshot,
		},
	})
}

export const changePassword = async (old_password: string, new_password: string, accessToken?: string): Promise<void> => {
	return fetchWithAuth<void>(`${API_URL}/auth/password`, accessToken, {
		method: "POST",
		body: {
			old_password,
			new_password,
		},
	})
}

export const changeEmail = async (new_email: string, accessToken?: string): Promise<void> => {
	return fetchWithAuth<void>(`${API_URL}/auth/email`, accessToken, {
		method: "POST",
		body: {
			new_email
		},
	})
}