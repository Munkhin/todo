import { api } from './client'

export type CalendarEventType = 'study' | 'break' | 'other'
export type CalendarEventPriority = 'low' | 'medium' | 'high'

export interface CalendarEvent {
  id: number
  title: string
  start_time: string
  end_time: string
  event_type: CalendarEventType
  priority: CalendarEventPriority
  task_id?: number
  source: 'user' | 'system' | 'scheduler'
  description?: string
  created_at?: string
  updated_at?: string
}

export async function getEvents(userId: number, startDate?: string, endDate?: string) {
  const params = new URLSearchParams()
  params.set('user_id', String(userId))
  if (startDate) params.set('start_date', startDate)
  if (endDate) params.set('end_date', endDate)
  return api.get<{ events: CalendarEvent[] }>(`/api/calendar/events?${params.toString()}`)
}

export async function createManualEvent(payload: {
  user_id: number
  title: string
  start_time: string
  end_time: string
  event_type?: CalendarEventType
  priority?: CalendarEventPriority
  description?: string
  task_id?: number
}) {
  return api.post<{ id: number }>(`/api/calendar/events`, payload)
}

export async function updateManualEvent(eventId: number, updates: Partial<{
  title: string
  start_time: string
  end_time: string
  event_type: CalendarEventType
  priority: CalendarEventPriority
  description: string
}>) {
  return api.put<{ ok: boolean }>(`/api/calendar/events/${eventId}`, updates)
}

export async function deleteEvent(eventId: number) {
  return api.delete<{ ok: boolean }>(`/api/calendar/events/${eventId}`)
}
