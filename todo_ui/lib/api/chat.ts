import { api } from './client'
import type { CalendarEvent } from './calendar'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  events?: CalendarEvent[]
}

export async function sendChatMessage(userId: number, message: string) {
  return api.post<{ response: string; events?: CalendarEvent[] }>(`/api/chat/message`, {
    user_id: userId,
    message,
  })
}

export async function getChatHistory(userId: number) {
  return api.get<{ messages: ChatMessage[] }>(`/api/chat/history/${userId}`)
}

export async function clearChatHistory(userId: number) {
  return api.delete<{ ok: boolean }>(`/api/chat/history/${userId}`)
}

// Upload a file for the agent to process (PDF/image/text)
export interface UploadFileResponse {
  success: boolean
  extracted_text?: string
  brain_dump_id?: number
  message: string
}

export async function uploadChatFile(userId: number, file: File): Promise<UploadFileResponse> {
  const form = new FormData()
  form.append('file', file)
  // Use a relative URL so it works with same-origin proxy
  const res = await fetch(`/api/chat/upload?user_id=${encodeURIComponent(userId)}`, {
    method: 'POST',
    body: form,
    // Intentionally omit Content-Type so browser sets multipart boundary
  })
  if (!res.ok) {
    const text = await res.text().catch(() => 'Upload failed')
    throw new Error(text || 'Upload failed')
  }
  return res.json()
}
