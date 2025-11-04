// Client-side demo storage: tasks, events, chat messages in localStorage only.
// No backend calls. Used when ScheduleView is in demoMode.

import type { Task } from '@/lib/api/tasks'
import type { CalendarEvent } from '@/lib/api/calendar'

type ChatRole = 'user' | 'assistant'

interface DemoChatMessage {
  role: ChatRole
  content: string
  timestamp: string
}

interface DemoState {
  nextTaskId: number
  nextEventId: number
  tasks: Task[]
  events: CalendarEvent[]
  messages: DemoChatMessage[]
}

// Generate unique session ID per demo visitor
function getDemoSessionId(): string {
  if (typeof window === 'undefined') return 'demo-server'

  const SESSION_KEY = 'demoSessionId'
  let sessionId = window.sessionStorage.getItem(SESSION_KEY)

  if (!sessionId) {
    // Create new session ID for this browser tab
    sessionId = `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    window.sessionStorage.setItem(SESSION_KEY, sessionId)
  }

  return sessionId
}

function getStorageKey(): string {
  return `demoState:${getDemoSessionId()}`
}

function nowIso() {
  return new Date().toISOString()
}

function readState(): DemoState {
  if (typeof window === 'undefined') {
    return { nextTaskId: 1, nextEventId: 1, tasks: [], events: [], messages: [] }
  }
  try {
    const raw = window.localStorage.getItem(getStorageKey())
    if (!raw) return { nextTaskId: 1, nextEventId: 1, tasks: [], events: [], messages: [] }
    const parsed = JSON.parse(raw) as DemoState
    // basic shape guard
    return {
      nextTaskId: parsed?.nextTaskId ?? 1,
      nextEventId: parsed?.nextEventId ?? 1,
      tasks: Array.isArray(parsed?.tasks) ? parsed.tasks : [],
      events: Array.isArray(parsed?.events) ? parsed.events : [],
      messages: Array.isArray(parsed?.messages) ? parsed.messages : [],
    }
  } catch {
    return { nextTaskId: 1, nextEventId: 1, tasks: [], events: [], messages: [] }
  }
}

function writeState(state: DemoState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(getStorageKey(), JSON.stringify(state))
}

// Tasks API (local)
export async function demoListTasks(): Promise<Task[]> {
  const s = readState()
  return s.tasks
}

export async function demoCreateTask(taskData: Partial<Task> & { topic: string; estimated_minutes: number; due_date: string; difficulty?: number; description?: string; scheduled_start?: string; scheduled_end?: string; status?: string }): Promise<Task> {
  const s = readState()
  const id = s.nextTaskId
  const task: Task = {
    id,
    user_id: -1, // Demo user ID (not persisted to backend)
    topic: taskData.topic,
    estimated_minutes: taskData.estimated_minutes,
    difficulty: taskData.difficulty ?? 3,
    due_date: taskData.due_date,
    description: taskData.description,
    status: taskData.status ?? (taskData.scheduled_start && taskData.scheduled_end ? 'scheduled' : 'unscheduled'),
    scheduled_start: taskData.scheduled_start,
    scheduled_end: taskData.scheduled_end,
    review_count: 0,
    confidence_score: 1.0,
  }
  s.tasks = [...s.tasks, task]
  s.nextTaskId = id + 1

  // If scheduled times provided, also create a matching event
  if (task.scheduled_start && task.scheduled_end) {
    const evId = s.nextEventId
    const ev: CalendarEvent = {
      id: evId,
      title: task.topic,
      start_time: task.scheduled_start,
      end_time: task.scheduled_end,
      event_type: 'study',
      source: 'user',
      task_id: task.id,
    }
    s.events = [...s.events, ev]
    s.nextEventId = evId + 1
  }

  writeState(s)
  return task
}

export async function demoUpdateTask(taskId: number, updates: Partial<Task>): Promise<Task | undefined> {
  const s = readState()
  let updated: Task | undefined
  s.tasks = s.tasks.map((t) => {
    if (t.id !== taskId) return t
    updated = { ...t, ...updates }
    return updated
  })

  // keep linked events in sync if scheduled times changed
  if (updated && (updates.scheduled_start || updates.scheduled_end || updates.topic || updates.description)) {
    s.events = s.events.map((e) => {
      if (e.task_id !== taskId) return e
      return {
        ...e,
        title: updated!.topic,
        start_time: updated!.scheduled_start ?? e.start_time,
        end_time: updated!.scheduled_end ?? e.end_time,
      }
    })
  }
  writeState(s)
  return updated
}

export async function demoDeleteTask(taskId: number): Promise<void> {
  const s = readState()
  s.tasks = s.tasks.filter((t) => t.id !== taskId)
  s.events = s.events.filter((e) => e.task_id !== taskId)
  writeState(s)
}

// Events API (local)
export async function demoListEventsInRange(startIso?: string, endIso?: string): Promise<CalendarEvent[]> {
  const s = readState()
  if (!startIso || !endIso) return s.events
  const start = new Date(startIso).getTime()
  const end = new Date(endIso).getTime()
  return s.events.filter((e) => {
    const es = new Date(e.start_time).getTime()
    const ee = new Date(e.end_time).getTime()
    return es >= start && ee <= end
  })
}

export async function demoUpsertEvent(event: Partial<CalendarEvent> & { title: string; start_time: string; end_time: string; event_type?: 'study' | 'rest' | 'break'; task_id?: number }): Promise<CalendarEvent> {
  const s = readState()
  if (event.id != null) {
    let updated: CalendarEvent | undefined
    s.events = s.events.map((e) => {
      if (e.id !== event.id) return e
      updated = { ...e, ...event } as CalendarEvent
      return updated
    })
    writeState(s)
    return (updated as CalendarEvent)
  }
  const id = s.nextEventId
  const ev: CalendarEvent = {
    id,
    title: event.title,
    start_time: event.start_time,
    end_time: event.end_time,
    event_type: event.event_type ?? 'study',
    source: 'user',
    task_id: event.task_id,
  }
  s.events = [...s.events, ev]
  s.nextEventId = id + 1
  writeState(s)
  return ev
}

export async function demoDeleteEvent(eventId: number): Promise<void> {
  const s = readState()
  s.events = s.events.filter((e) => e.id !== eventId)
  writeState(s)
}

// Chat (local, canned)
export async function demoSendMessage(_userId: number, message: string): Promise<string> {
  const s = readState()
  const now = nowIso()
  // record user message
  s.messages = [
    ...s.messages,
    { role: 'user', content: message, timestamp: now },
  ]

  // Create a simple scheduled task + calendar event in the near future
  const durationMin = 60
  const start = new Date()
  // snap start to next 15-minute block
  const m = start.getMinutes()
  const snapDelta = (15 - (m % 15)) % 15
  start.setMinutes(m + snapDelta, 0, 0)
  const end = new Date(start)
  end.setMinutes(start.getMinutes() + durationMin)

  await demoCreateTask({
    topic: message.trim() || 'Scheduled task',
    estimated_minutes: durationMin,
    difficulty: 3,
    due_date: end.toISOString(),
    description: 'Created from demo chat',
    scheduled_start: start.toISOString(),
    scheduled_end: end.toISOString(),
    status: 'scheduled',
  })

  const reply = 'Scheduled your request in the next hour (demo).'
  s.messages = [
    ...s.messages,
    { role: 'assistant', content: reply, timestamp: nowIso() },
  ]
  writeState(s)
  return reply
}

export async function demoClearAll(): Promise<void> {
  writeState({ nextTaskId: 1, nextEventId: 1, tasks: [], events: [], messages: [] })
}

// Read back the last assistant reply (to persist model response UI in demo)
export async function demoGetLastAssistantMessage(): Promise<string | null> {
  const s = readState()
  const last = [...s.messages].reverse().find(m => m.role === 'assistant')
  return last?.content ?? null
}
