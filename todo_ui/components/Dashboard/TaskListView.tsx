"use client"
import { useEffect, useMemo } from 'react'
import { useTaskStore } from '@/lib/store/useTaskStore'
import { useScheduleStore } from '@/lib/store/useScheduleStore'

export default function TaskListView() {
  const tasks = useTaskStore((s) => s.tasks) ?? []
  const fetchTasks = useTaskStore((s) => s.fetchTasks)
  const events = useScheduleStore((s) => s.events) ?? []

  useEffect(() => {
    fetchTasks({ include_completed: false }).catch(() => {})
  }, [fetchTasks])

  // map task_id -> event for quick lookup
  const taskEventMap = useMemo(() => {
    const map = new Map<number, typeof events[0]>()
    events.forEach(ev => {
      if (ev.task_id) {
        map.set(ev.task_id, ev)
      }
    })
    return map
  }, [events])

  return (
    <section aria-labelledby="tasks-heading" className="space-y-4">
      <h1 id="tasks-heading" className="text-2xl font-semibold">Your Tasks</h1>
      <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        {tasks.length === 0 && (
          <li className="p-4 text-gray-500">No tasks yet. Create one from the Schedule tab</li>
        )}
        {tasks.map((t) => {
          const event = taskEventMap.get(t.id)
          const isScheduled = !!event

          return (
            <li key={t.id} className="flex items-start justify-between p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-medium text-gray-900">{t.topic}</p>
                <p className="mt-1 text-sm text-gray-600">
                  Due: {new Date(t.due_date).toLocaleString()}
                </p>
                {isScheduled && event && (
                  <p className="mt-1 text-sm text-green-600">
                    Scheduled: {new Date(event.start_time).toLocaleString()} - {new Date(event.end_time).toLocaleTimeString()}
                  </p>
                )}
              </div>
              <div className="ml-4 flex shrink-0 flex-col items-end gap-1">
                <span className="text-sm text-gray-500">{t.estimated_minutes}m</span>
                {isScheduled ? (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                    Scheduled
                  </span>
                ) : (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    Unscheduled
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
