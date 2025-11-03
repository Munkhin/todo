import { create } from 'zustand'
import type { CalendarEvent } from '@/lib/api/calendar'
import { getEvents } from '@/lib/api/calendar'
import { runSchedule } from '@/lib/api/schedule'

interface ScheduleStore {
  events: CalendarEvent[]
  loading: boolean
  error: string | null
  fetchEvents: (start?: string, end?: string, userId?: number) => Promise<void>
  generateSchedule: (userId: number) => Promise<{ scheduled_count?: number } | void>
}

export const useScheduleStore = create<ScheduleStore>((set) => ({
  events: [],
  loading: false,
  error: null,

  fetchEvents: async (start, end, userId = 0) => {
    set({ loading: true, error: null })
    try {
      const res = await getEvents(userId, start, end)
      set({ events: res.events, loading: false })
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Failed to load events' })
    }
  },

  generateSchedule: async (_userId: number) => {
    set({ loading: true, error: null })
    try {
      const res = await runSchedule({})
      set({ loading: false })
      return { scheduled_count: res.scheduled_count }
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Failed to generate schedule' })
    }
  },
}))

