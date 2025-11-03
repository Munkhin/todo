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

