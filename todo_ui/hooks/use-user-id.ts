"use client"
import { useSession } from "next-auth/react"

export function useUserId(): number {
  const { data } = useSession()
  // Prefer backend-provided numeric id from localStorage
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem('backendUserId')
    const parsedStored = stored ? parseInt(stored, 10) : NaN
    if (Number.isFinite(parsedStored)) return parsedStored
  }

  // Fallback: try NextAuth's user.id if numeric-like
  const id = (data?.user as any)?.id
  const parsed = typeof id === 'string' ? parseInt(id, 10) : id
  return Number.isFinite(parsed) ? parsed : 0
}
