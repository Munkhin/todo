import { create } from 'zustand'
import type { CalendarEvent } from '@/lib/api/calendar'
import { clearChatHistory, getChatHistory, sendChatMessage } from '@/lib/api/chat'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  events?: CalendarEvent[]
}

interface ChatStore {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  onTasksCreated?: () => void  // callback when agent creates tasks
  setOnTasksCreated: (callback: () => void) => void
  loadHistory: (userId: number) => Promise<void>
  sendMessage: (message: string, userId: number) => Promise<string>
  clearHistory: (userId: number) => Promise<void>
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isLoading: false,
  error: null,
  onTasksCreated: undefined,

  setOnTasksCreated: (callback) => {
    set({ onTasksCreated: callback })
  },

  loadHistory: async (userId) => {
    set({ isLoading: true, error: null })
    try {
      const res = await getChatHistory(userId)
      set({ messages: res.messages, isLoading: false })
    } catch (e) {
      set({ isLoading: false, error: e instanceof Error ? e.message : 'Failed to load history' })
    }
  },

  sendMessage: async (message, userId) => {
    const now = new Date().toISOString()
    set({ messages: [...get().messages, { role: 'user', content: message, timestamp: now }], isLoading: true })
    try {
      const res = await sendChatMessage(userId, message)
      const assistant: ChatMessage = {
        role: 'assistant',
        content: res.response,
        timestamp: new Date().toISOString(),
        events: res.events,
      }
      set({ messages: [...get().messages, assistant], isLoading: false })

      // trigger task refresh if events were created (indicates tasks were created/scheduled)
      if (res.events && res.events.length > 0) {
        const callback = get().onTasksCreated
        if (callback) {
          callback()
        }
      }

      return res.response
    } catch (e) {
      set({ isLoading: false, error: e instanceof Error ? e.message : 'Failed to send message' })
      throw e
    }
  },

  clearHistory: async (userId) => {
    try {
      await clearChatHistory(userId)
      set({ messages: [] })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to clear history' })
    }
  },
}))

