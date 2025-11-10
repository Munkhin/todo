"use client"
import { useEffect } from "react"
// react query
import { useTasks } from "@/hooks/use-tasks"
import { taskEvents } from "@/lib/events/taskEvents"
// end react query
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { tasksViewStyles } from "./TasksView.styles"
import { Calendar } from "lucide-react"

export default function TasksView() {
  const { tasks, fetchTasks } = useTasks()

  // subscribe to task events (when chat creates tasks)
  useEffect(() => {
    const unsubscribe = taskEvents.subscribe(() => {
      fetchTasks({}).catch(() => {})
    })
    return unsubscribe
  }, [fetchTasks])

  return (
    <section className={tasksViewStyles.container} aria-labelledby="tasks-heading">
      <div className={tasksViewStyles.header}>
        <h1 id="tasks-heading" className={tasksViewStyles.title}>Your Tasks</h1>
      </div>
      <div className={tasksViewStyles.grid}>
        {tasks.map((t) => (
          <article key={t.id}>
            <Card>
              <CardHeader className={tasksViewStyles.cardHeader}>
                <div className={tasksViewStyles.cardHeaderRow}>
                  <h2 className={tasksViewStyles.cardTitle}>{t.topic}</h2>
                  <span className={tasksViewStyles.cardMeta} aria-label="Estimated minutes">{t.estimated_minutes}m</span>
                </div>
              </CardHeader>
              <CardContent>
                <p className={tasksViewStyles.cardDesc}>{t.description || "No description"}</p>
                <p className={tasksViewStyles.cardDue}>Due: {new Date(t.due_date).toLocaleString()}</p>
                <p className={tasksViewStyles.cardMeta}>Difficulty: {t.difficulty}/5</p>

                {/* scheduled sessions */}
                {t.events && t.events.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="h-4 w-4" />
                      <span>Scheduled Sessions</span>
                    </div>
                    <ul className="space-y-1">
                      {t.events.map((event) => (
                        <li key={event.id} className="text-sm text-gray-600 flex items-start">
                          <span className="mr-2">•</span>
                          <span>
                            {new Date(event.start_time).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                            {' - '}
                            {new Date(event.end_time).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </article>
        ))}
      </div>
      {tasks.length === 0 && (
        <p className={tasksViewStyles.empty}>
          No tasks found. Schedule one with AI in the schedule tab.
        </p>
      )}
    </section>
  )
}
