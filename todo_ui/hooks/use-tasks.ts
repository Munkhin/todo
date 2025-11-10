// react query
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listTasks, type Task } from '@/lib/api/tasks'

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

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      const response = await listTasks(filters)
      return response.tasks
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
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
