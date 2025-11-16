export type DurationUnit = 'minutes' | 'hours'

// Normalize whitespace and lowercase for easier parsing.
const normalize = (value: string) => value.trim().toLowerCase()

// Parse user input like "90", "1:30", "1h 30m", "1.5h", or "45m" into minutes.
export function parseDurationInput(
  rawValue: string,
  plainNumberUnit: DurationUnit = 'minutes'
): number | null {
  const value = normalize(rawValue)
  if (!value) {
    return null
  }

  // support HH:MM (hours:minutes)
  const colonMatch = value.match(/^(\d{1,3}):(\d{1,2})$/)
  if (colonMatch) {
    const hours = parseInt(colonMatch[1], 10)
    const minutes = parseInt(colonMatch[2], 10)
    if (minutes >= 60) return null
    return hours * 60 + minutes
  }

  // support "xh ym" or "xh" or "ym"
  const hourMinuteMatch = value.match(/^(\d+(?:\.\d+)?)h(?:\s*(\d+(?:\.\d+)?)m)?$/)
  if (hourMinuteMatch) {
    const hours = parseFloat(hourMinuteMatch[1])
    const minutes = hourMinuteMatch[2] ? parseFloat(hourMinuteMatch[2]) : 0
    if (minutes >= 60) return null
    return Math.round(hours * 60 + minutes)
  }

  const minuteMatch = value.match(/^(\d+(?:\.\d+)?)m$/)
  if (minuteMatch) {
    const minutes = parseFloat(minuteMatch[1])
    return Math.round(minutes)
  }

  // support "xh ym" with whitespace tokens (e.g., "1h 30m")
  if (value.includes(' ')) {
    const tokens = value.split(/\s+/)
    let totalMinutes = 0
    let parsed = false
    for (const token of tokens) {
      const minutes = parseDurationInput(token, plainNumberUnit)
      if (minutes === null) {
        return null
      }
      parsed = true
      totalMinutes += minutes
    }
    if (parsed) {
      return totalMinutes
    }
  }

  // fallback: interpret plain number using provided unit
  if (!Number.isNaN(Number(value))) {
    const numeric = parseFloat(value)
    if (!Number.isFinite(numeric)) return null
    if (plainNumberUnit === 'hours') {
      return Math.round(numeric * 60)
    }
    return Math.round(numeric)
  }

  return null
}

export function formatDurationInput(
  minutes: number | null | undefined,
  plainNumberUnit: DurationUnit = 'minutes'
): string {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) {
    return ''
  }

  const totalMinutes = Math.max(0, Math.round(minutes))
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60

  if (plainNumberUnit === 'hours') {
    if (mins === 0) {
      return String(hours)
    }
    return `${hours}:${mins.toString().padStart(2, '0')}`
  }

  if (totalMinutes < 60) {
    return String(totalMinutes)
  }

  if (mins === 0) {
    return `${hours}:00`
  }

  return `${hours}:${mins.toString().padStart(2, '0')}`
}

export function buildDurationHelperText(
  plainNumberUnit: DurationUnit = 'minutes'
): string {
  const base = 'Enter minutes or H:MM (e.g., 90 or 1:30)'
  if (plainNumberUnit === 'hours') {
    return `${base}. Plain numbers are treated as hours.`
  }
  return `${base}. Plain numbers are treated as minutes.`
}
