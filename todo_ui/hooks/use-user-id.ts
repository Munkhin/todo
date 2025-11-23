"use client"
import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { api } from "@/lib/api/client"

export function useUserId(): number | null {
  // MOCK FOR DEMO
  return 1;

  /*
  const { data, status } = useSession()
  const [userId, setUserId] = useState<number | null>(null)

  useEffect(() => {
    // keep null until session loads
    if (status === 'loading') {
      return
    }

    if (!data?.user?.email) {
      setUserId(null)
      return
    }

    // call /api/user/me to get or create backend user
    api.post<{ user_id: number }>('/api/user/me', {
      email: data.user.email,
      name: data.user.name,
    })
      .then((res) => {
        if (res.user_id && Number.isFinite(res.user_id) && res.user_id > 0) {
          setUserId(res.user_id)
        } else {
          setUserId(null)
        }
      })
      .catch((err) => {
        console.error('[useUserId] Failed to get user:', err)
        setUserId(null)
      })
  }, [data, status])

  return userId
  */
}
