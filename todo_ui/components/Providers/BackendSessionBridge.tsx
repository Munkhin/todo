"use client"
import { useEffect } from "react"
import { useSession } from "next-auth/react"

export default function BackendSessionBridge() {
  const { data } = useSession()
  useEffect(() => {
    const accessToken = (data as any)?.accessToken as string | undefined
    if (!accessToken) return

    const existing = typeof window !== 'undefined' ? window.localStorage.getItem('backendUserId') : null
    if (existing) {
      console.log(`[BackendSessionBridge] backendUserId already set: ${existing}`)
      return
    }

    console.log('[BackendSessionBridge] Registering session with backend...')
    // Register session with backend and persist numeric user id
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    fetch(`${backendUrl}/api/user/register-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: accessToken }),
    })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((res) => {
        const id = res?.db_user_id
        console.log(`[BackendSessionBridge] Received db_user_id: ${id}`)
        if (id && typeof window !== 'undefined') {
          window.localStorage.setItem('backendUserId', String(id))
          console.log(`[BackendSessionBridge] Stored backendUserId: ${id}`)
          // Trigger a re-render by dispatching storage event
          window.dispatchEvent(new Event('storage'))
        }
      })
      .catch((err) => {
        console.error('[BackendSessionBridge] Failed to register session:', err)
      })
  }, [data])

  return null
}

