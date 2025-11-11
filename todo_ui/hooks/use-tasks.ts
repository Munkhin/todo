// react query
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listTasks, type Task } from '@/lib/api/tasks'
import { useUserId } from './use-user-id'

interface UseTasksOptions {
  filters?: {
    source?: string
    include_completed?: boolean
    start_date?: string
    end_date?: string
  }
}

export function useTasks(options: UseTasksOptions = {}) {
  const queryClient = useQueryClient()
  const { filters } = options
  const userId = useUserId()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['tasks', filters, userId],
    queryFn: async () => {
      if (!userId) return []
      const response = await listTasks({ ...filters, user_id: userId })
      return response.tasks
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!userId, // only run query when userId is available
  })

  const tasks = data ?? []

  const fetchTasks = async (newFilters?: UseTasksOptions['filters']) => {
    if (newFilters) {
      // Invalidate with new filters
      await queryClient.invalidateQueries({ queryKey: ['tasks', newFilters] })
    } else {
      await refetch()
    }
  }

  return {
    tasks,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    fetchTasks,
    refetch,
  }
}
// end react query
