// controllers/calendar.ts
import { getEvents } from "@/lib/api/calendar"

export default class CalendarController {
  static async loadEvents(userId: string) {
    const { events } = await getEvents(Number(userId))
    return events
  }
}
