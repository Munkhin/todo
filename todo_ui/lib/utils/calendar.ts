// Calendar utility functions for date manipulation and formatting

// Use percentage-based positioning instead of fixed pixels
export const PERCENT_PER_HOUR = 100 // 100% divided by total hours
export const PERCENT_PER_MIN = PERCENT_PER_HOUR / 60

// Date navigation helpers
export function startOfWeek(date: Date): Date {
  // Monday as start of week
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 (Sun) -> 6 (Sat)
  const diffFromMonday = (day + 6) % 7 // 0 when Mon
  d.setDate(d.getDate() - diffFromMonday)
  return d
}

export function endOfWeek(date: Date): Date {
  const d = startOfWeek(date)
  d.setDate(d.getDate() + 6)
  d.setHours(23, 59, 59, 999)
  return d
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function getWeekDates(date: Date): Date[] {
  const start = startOfWeek(date)
  return Array.from({ length: 7 }).map((_, i) =>
    new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
  )
}

export function isSameDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

// Formatting helpers
export function formatWeekTitle(date: Date): string {
  const days = getWeekDates(date)
  const first = days[0]
  const last = days[6]
  return `${first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${last.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

export function formatDayTitle(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

export function formatHour(h: number): string {
  const d = new Date()
  d.setHours(h % 24, 0, 0, 0)
  return d.toLocaleTimeString('en-US', { hour: 'numeric' })
}

// Time calculations
// Converts UTC ISO string to local time and returns minutes since midnight in user's timezone
export function minutesSinceStartOfDay(iso: string): number {
  const d = new Date(iso) // Parses UTC ISO and converts to browser's local timezone
  return d.getHours() * 60 + d.getMinutes()
}

export function getEventBox(
  startIso: string,
  endIso: string,
  baseHour: number,
  spanMinutes: number
): { top: string; height: string; minHeight: string } {
  const startMin = minutesSinceStartOfDay(startIso) - baseHour * 60
  const endMin = minutesSinceStartOfDay(endIso) - baseHour * 60
  const clampedTopMin = Math.max(0, Math.min(startMin, spanMinutes))
  const clampedEndMin = Math.max(0, Math.min(endMin, spanMinutes))
  const topPercent = (clampedTopMin / spanMinutes) * 100
  const heightPercent = ((clampedEndMin - clampedTopMin) / spanMinutes) * 100
  return {
    top: `${topPercent}%`,
    height: `${heightPercent}%`,
    minHeight: '20px' // Ensure minimum visibility
  }
}

export function getNowOffsetPercent(baseHour: number, spanMinutes: number): string {
  const now = new Date() // Uses browser's local timezone
  // Position the current time indicator with no artificial offset
  const min = now.getHours() * 60 + now.getMinutes() - baseHour * 60
  const clampedMin = Math.max(0, Math.min(min, spanMinutes))
  const percent = (clampedMin / spanMinutes) * 100
  return `${percent}%`
}

// Mouse interaction helpers
export function yToMinutes(clientY: number, el: HTMLDivElement | null, spanMinutes: number): number {
  if (!el) return 0
  const rect = el.getBoundingClientRect()
  const y = clientY - rect.top
  const heightPercent = (y / rect.height) * 100
  const min = (heightPercent / 100) * spanMinutes
  return Math.max(0, Math.min(min, spanMinutes))
}

export function snap15(min: number): number {
  return Math.round(min / 15) * 15
}

export function xToDayIndex(clientX: number, grid: HTMLDivElement | null): number {
  if (!grid) return 0
  const rect = grid.getBoundingClientRect()
  const colW = rect.width / 7
  const idx = Math.floor((clientX - rect.left) / colW)
  return Math.max(0, Math.min(6, idx))
}

// Build hours sequence based on wake/sleep times
export function buildHoursSequence(wake: number, sleep: number): number[] {
  if (wake === sleep) return Array.from({ length: 24 }, (_, i) => (wake + i) % 24)
  if (wake < sleep) return Array.from({ length: sleep - wake + 1 }, (_, i) => wake + i)
  const toMidnight = Array.from({ length: 24 - wake }, (_, i) => wake + i)
  const fromMidnight = Array.from({ length: sleep + 1 }, (_, i) => i)
  return [...toMidnight, ...fromMidnight]
}
