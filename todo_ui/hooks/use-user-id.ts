"use client"
import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"

export function useUserId(): number {
  const { data } = useSession()
  const [userId, setUserId] = useState<number>(0)

  useEffect(() => {
    const updateUserId = () => {
      // Prefer backend-provided numeric id from localStorage
      if (typeof window !== 'undefined') {
        const stored = window.localStorage.getItem('backendUserId')
        const parsedStored = stored ? parseInt(stored, 10) : NaN
        if (Number.isFinite(parsedStored)) {
          setUserId(parsedStored)
          return
        }
      }

      // Fallback: try NextAuth's user.id if numeric-like
      const id = (data?.user as any)?.id
      const parsed = typeof id === 'string' ? parseInt(id, 10) : id
      setUserId(Number.isFinite(parsed) ? parsed : 0)
    }

    updateUserId()

    // Listen for storage changes
    window.addEventListener('storage', updateUserId)
    return () => window.removeEventListener('storage', updateUserId)
  }, [data])

  return userId
}
