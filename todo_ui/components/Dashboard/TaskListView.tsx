"use client"
import { useEffect } from 'react'
import { useTaskStore } from '@/lib/store/useTaskStore'

export default function TaskListView() {
  const tasks = useTaskStore((s) => s.tasks) ?? []
  const fetchTasks = useTaskStore((s) => s.fetchTasks)

  useEffect(() => {
    fetchTasks({ include_completed: false }).catch(() => {})
  }, [fetchTasks])

  return (
    <section aria-labelledby="tasks-heading" className="space-y-4">
      <h1 id="tasks-heading" className="text-2xl font-semibold">Your Tasks</h1>
      <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        {tasks.length === 0 && (
          <li className="p-4 text-gray-500">No tasks yet. Create one from the Schedule tab or API.</li>
        )}
        {tasks.map((t) => (
          <li key={t.id} className="flex items-start justify-between p-4">
            <div className="min-w-0">
              <p className="truncate text-lg font-medium text-gray-900">{t.topic}</p>
              <p className="mt-1 text-sm text-gray-600">Due: {new Date(t.due_date).toLocaleString()}</p>
            </div>
            <div className="ml-4 shrink-0 text-sm text-gray-500">{t.estimated_minutes}m</div>
          </li>
        ))}
      </ul>
    </section>
  )
}
