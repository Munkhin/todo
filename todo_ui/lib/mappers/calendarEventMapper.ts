// maps between our CalendarEvent schema and TUI Calendar EventObject schema

import type { EventObject } from "@toast-ui/calendar"
import type { CalendarEvent, CalendarEventType, CalendarEventPriority } from "../api/calendar"

// map our event type to TUI category
function mapEventTypeToCategory(eventType: CalendarEventType): 'time' | 'allday' {
    return 'time' // all our events are time-based for now
}

// map our event type to color
function mapEventTypeToColor(eventType: CalendarEventType): { backgroundColor: string; color: string } {
    const colorMap: Record<CalendarEventType, { backgroundColor: string; color: string }> = {
        study: { backgroundColor: '#03bd9e', color: '#ffffff' },
        break: { backgroundColor: '#ffa500', color: '#ffffff' },
        other: { backgroundColor: '#1f2937', color: '#ffffff' },
    }
    return colorMap[eventType] ?? { backgroundColor: '#1f2937', color: '#ffffff' }
}

// convert our CalendarEvent to TUI EventObject
export function toTUIEvent(event: CalendarEvent): EventObject {
    const colors = event.color_hex
        ? { backgroundColor: event.color_hex, color: '#ffffff' }
        : mapEventTypeToColor(event.event_type)

    return {
        id: String(event.id),
        calendarId: event.event_type,
        title: event.title,
        body: event.description || '',
        start: event.start_time,
        end: event.end_time,
        category: mapEventTypeToCategory(event.event_type),
        backgroundColor: colors.backgroundColor,
        color: colors.color,
        isReadOnly: event.source === 'system', // system events are read-only
        raw: {
            taskId: event.task_id,
            source: event.source,
            eventType: event.event_type,
            priority: event.priority || 'medium',
            description: event.description || '',
            colorHex: event.color_hex,
        },
    }
}

// convert TUI EventObject to our CalendarEvent format for API calls
export function fromTUIEvent(event: EventObject): Partial<CalendarEvent> {
    return {
        id: event.id ? Number(event.id) : undefined,
        title: event.title || '',
        description: event.body || event.raw?.description || '',
        start_time: typeof event.start === 'string' ? event.start : new Date(event.start as any).toISOString(),
        end_time: typeof event.end === 'string' ? event.end : new Date(event.end as any).toISOString(),
        event_type: (event.raw?.eventType || event.calendarId || 'study') as CalendarEventType,
        priority: (event.raw?.priority as CalendarEventPriority) || 'medium',
        task_id: event.raw?.taskId,
        color_hex: (event.raw?.colorHex as string | undefined) || undefined,
        source: event.raw?.source || 'user',
    }
}
