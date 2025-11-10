// react query
import { useQuery } from '@tanstack/react-query'
import { getSubscription, type Subscription } from '@/lib/api/subscription'

export function useSubscription(userId: number | null) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['subscription', userId],
    queryFn: async () => {
      if (!userId || userId <= 0) throw new Error('Invalid user ID')
      return await getSubscription(userId)
    },
    enabled: !!userId && userId > 0,
    staleTime: 3 * 60 * 1000, // 3 minutes
  })

  return {
    subscription: data ?? null,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  }
}
// end react query
