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

export const addUserMark = async (
	userId: number,
	markType: string,
	expiresAfterStatusEnds: number | null,
	customText?: string,
	expiresAt?: string,
	accessToken?: string
): Promise<void> => {
	return fetchWithAuth<void>(`${API_URL}/user-marks`, accessToken, {
		method: "POST",
		body: {
			user_id: userId,
			mark_type: markType,
			expires_after_status_ends: expiresAfterStatusEnds,
			custom_text: customText,
			expires_at: expiresAt,
		},
	})
}

export interface UserMark {
	id: number
	user_id: number
	mark_type: string
	custom_text: string | null
	expires_after_status_ends: number
	expires_at: string | null
}

export const fetchUserMarks = async (accessToken?: string): Promise<UserMark[]> => {
	return fetchWithAuth<UserMark[]>(`${API_URL}/user-marks`, accessToken)
}

export const fetchUserMarksByUserId = async (userId: number, accessToken?: string): Promise<UserMark[]> => {
	return fetchWithAuth<UserMark[]>(`${API_URL}/user-marks/user/${userId}`, accessToken)
}

export const fetchExpiredUserMarksByUserId = async (userId: number, accessToken?: string): Promise<UserMark[]> => {
	return fetchWithAuth<UserMark[]>(`${API_URL}/user-marks/user/${userId}/expired`, accessToken)
}

export const updateUserMark = async (
	id: number,
	userId: number,
	markType: string,
	expiresAfterStatusEnds: number,
	customText?: string,
	accessToken?: string
): Promise<UserMark> => {
	return fetchWithAuth<UserMark>(`${API_URL}/user-marks/${id}`, accessToken, {
		method: "PUT",
		body: {
			user_id: userId,
			mark_type: markType,
			expires_after_status_ends: expiresAfterStatusEnds,
			custom_text: customText,
		},
	})
}

export const deleteUserMark = async (id: number, accessToken?: string): Promise<void> => {
	return fetchWithAuth<void>(`${API_URL}/user-marks/${id}`, accessToken, {
		method: "DELETE",
	})
}

export const expireAllUserMarks = async (userId: number, accessToken?: string): Promise<void> => {
	return fetchWithAuth<void>(`${API_URL}/user-marks/user/${userId}/expire-all`, accessToken, {
		method: "PUT",
	})
}

export const deleteExpiredUserMarks = async (userId: number, accessToken?: string): Promise<void> => {
	return fetchWithAuth<void>(`${API_URL}/user-marks/user/${userId}/expired`, accessToken, {
		method: "DELETE",
	})
}