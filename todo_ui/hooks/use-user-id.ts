"use client"
import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"

export function useUserId(): number {
  const { data } = useSession()
  const [userId, setUserId] = useState<number>(0)

  useEffect(() => {
    if (!data?.user?.email) {
      setUserId(0)
      return
    }

    // Check localStorage first
    const stored = window.localStorage.getItem('backendUserId')
    if (stored) {
      const parsedStored = parseInt(stored, 10)
      if (Number.isFinite(parsedStored)) {
        setUserId(parsedStored)
        return
      }
    }

    // Call /api/user/me to get or create user
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    fetch(`${backendUrl}/api/user/me`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: data.user.email,
        name: data.user.name,
      }),
    })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((res) => {
        const id = res?.user_id
        if (id && Number.isFinite(id)) {
          setUserId(id)
          window.localStorage.setItem('backendUserId', String(id))
        }
      })
      .catch((err) => {
        console.error('[useUserId] Failed to get user:', err)
      })
  }, [data])

  return userId
}
