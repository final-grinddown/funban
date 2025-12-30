import { fetchWithAuth } from "@/app/api/fetchWithAuth"
import { base64EncodeUnicode } from "@/utils/helpers"
import { IHistoryItem, ISnapshotData } from "@/utils/interfaces"

export const fetchHistory = async (apiUrl: string, accessToken?: string): Promise<IHistoryItem[]> => {
  return fetchWithAuth<IHistoryItem[]>(`${apiUrl}/history`, accessToken)
}

export const fetchHistoryItem = async (apiUrl: string, id: string, accessToken?: string): Promise<IHistoryItem> => {
  return fetchWithAuth<IHistoryItem>(`${apiUrl}/history/browser/${id}`, accessToken)
}

export const fetchHistoryItemLast = async (apiUrl: string, accessToken?: string): Promise<IHistoryItem> => {
  return fetchWithAuth<IHistoryItem>(`${apiUrl}/history/browser`, accessToken)
}

export const postSnapshot = async (apiUrl: string, data: ISnapshotData, accessToken?: string): Promise<void> => {
  const encodedSnapshot = base64EncodeUnicode(JSON.stringify(data.notes))

  return fetchWithAuth<void>(`${apiUrl}/history`, accessToken, {
    method: "POST",
    body: {
      label: data.label,
      snapshot: encodedSnapshot,
    },
  })
}

export const changePassword = async (
  apiUrl: string,
  old_password: string,
  new_password: string,
  accessToken?: string,
): Promise<void> => {
  return fetchWithAuth<void>(`${apiUrl}/auth/password`, accessToken, {
    method: "POST",
    body: {
      old_password,
      new_password,
    },
  })
}

export const changeEmail = async (apiUrl: string, new_email: string, accessToken?: string): Promise<void> => {
  return fetchWithAuth<void>(`${apiUrl}/auth/email`, accessToken, {
    method: "POST",
    body: {
      new_email,
    },
  })
}

export const addUserMark = async (
  apiUrl: string,
  userId: number,
  markType: string,
  expiresAfterStatusEnds: number | null,
  customText?: string,
  expiresAt?: string,
  accessToken?: string,
): Promise<void> => {
  return fetchWithAuth<void>(`${apiUrl}/user-marks`, accessToken, {
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

export const fetchUserMarks = async (apiUrl: string, accessToken?: string): Promise<UserMark[]> => {
  return fetchWithAuth<UserMark[]>(`${apiUrl}/user-marks`, accessToken)
}

export const fetchUserMarksByUserId = async (
  apiUrl: string,
  userId: number,
  accessToken?: string,
): Promise<UserMark[]> => {
  return fetchWithAuth<UserMark[]>(`${apiUrl}/user-marks/user/${userId}`, accessToken)
}

export const fetchExpiredUserMarksByUserId = async (
  apiUrl: string,
  userId: number,
  accessToken?: string,
): Promise<UserMark[]> => {
  return fetchWithAuth<UserMark[]>(`${apiUrl}/user-marks/user/${userId}/expired`, accessToken)
}

export const updateUserMark = async (
  apiUrl: string,
  id: number,
  userId: number,
  markType: string,
  expiresAfterStatusEnds: number | null,
  customText?: string,
  expiresAt?: string,
  accessToken?: string,
): Promise<UserMark> => {
  return fetchWithAuth<UserMark>(`${apiUrl}/user-marks/${id}`, accessToken, {
    method: "PUT",
    body: {
      user_id: userId,
      mark_type: markType,
      expires_after_status_ends: expiresAfterStatusEnds,
      custom_text: customText,
      expires_at: expiresAt,
    },
  })
}

export const deleteUserMark = async (apiUrl: string, id: number, accessToken?: string): Promise<void> => {
  return fetchWithAuth<void>(`${apiUrl}/user-marks/${id}`, accessToken, {
    method: "DELETE",
  })
}

export const expireAllUserMarks = async (apiUrl: string, userId: number, accessToken?: string): Promise<void> => {
  return fetchWithAuth<void>(`${apiUrl}/user-marks/user/${userId}/expire-all`, accessToken, {
    method: "PUT",
  })
}

export const deleteExpiredUserMarks = async (apiUrl: string, userId: number, accessToken?: string): Promise<void> => {
  return fetchWithAuth<void>(`${apiUrl}/user-marks/user/${userId}/expired`, accessToken, {
    method: "DELETE",
  })
}
