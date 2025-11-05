"use client"
import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { api } from "@/lib/api/client"

export function useUserId(): number {
  const { data } = useSession()
  const [userId, setUserId] = useState<number>(0)

  useEffect(() => {
    if (!data?.user?.email) {
      setUserId(0)
      return
    }

    // Call /api/user/me to get or create backend user
    api.post<{ user_id: number }>('/api/user/me', {
      email: data.user.email,
      name: data.user.name,
    })
      .then((res) => {
        if (res.user_id && Number.isFinite(res.user_id)) {
          setUserId(res.user_id)
        }
      })
      .catch((err) => {
        console.error('[useUserId] Failed to get user:', err)
        setUserId(0)
      })
  }, [data])

  return userId
}
