import { api } from './client'

export type CalendarEventType = 'study' | 'rest' | 'break'

export interface CalendarEvent {
  id: number
  title: string
  start_time: string
  end_time: string
  event_type: CalendarEventType
  task_id?: number
  source: 'user' | 'system'
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
  task_id?: number
}) {
  return api.post<{ id: number }>(`/api/calendar/events`, payload)
}

export async function updateManualEvent(eventId: number, updates: Partial<{
  title: string
  start_time: string
  end_time: string
  event_type: CalendarEventType
}>) {
  return api.put<{ ok: boolean }>(`/api/calendar/events/${eventId}`, updates)
}

export async function deleteEvent(eventId: number) {
  return api.delete<{ ok: boolean }>(`/api/calendar/events/${eventId}`)
}

