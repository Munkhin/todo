"use client"
import { useEffect } from "react"
import { useSession } from "next-auth/react"

export default function BackendSessionBridge() {
  const { data } = useSession()
  useEffect(() => {
    const accessToken = (data as any)?.accessToken as string | undefined
    if (!accessToken) return

    const existing = typeof window !== 'undefined' ? window.localStorage.getItem('backendUserId') : null
    if (existing) return

    // Register session with backend and persist numeric user id
    fetch('/api/auth/register-nextauth-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: accessToken }),
    })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((res) => {
        const id = res?.db_user_id
        if (id && typeof window !== 'undefined') {
          window.localStorage.setItem('backendUserId', String(id))
        }
      })
      .catch(() => {})
  }, [data])

  return null
}

