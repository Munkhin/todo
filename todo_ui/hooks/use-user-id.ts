"use client"
import { useSession } from "next-auth/react"

export function useUserId(): number {
  const { data } = useSession()
  // Session user id may be string; backend expects number; default 0.
  const id = (data?.user as any)?.id
  const parsed = typeof id === 'string' ? parseInt(id, 10) : id
  return Number.isFinite(parsed) ? parsed : 0
}

