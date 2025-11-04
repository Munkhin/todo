import { api } from './client'

export async function updateUserTimezone(userId: number, timezone: string) {
  return api.post('/api/auth/update-timezone', {
    user_id: userId,
    timezone
  })
}

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}
