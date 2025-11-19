"use client"
import { useEffect, useState } from "react"
// react query
import { useTasks } from "@/hooks/use-tasks"
import { taskEvents } from "@/lib/events/taskEvents"
// end react query
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { tasksViewStyles } from "./TasksView.styles"
import TaskEditSheet from "./TaskEditSheet"
import { type Task } from "@/lib/api/tasks"
import { Calendar, Edit3 } from "lucide-react"

export default function TasksView() {
  const { tasks, fetchTasks } = useTasks()
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isEditorOpen, setEditorOpen] = useState(false)

  const openEditor = (task: Task) => {
    setEditingTask(task)
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditingTask(null)
  }

  // subscribe to task events (when chat creates tasks)
  useEffect(() => {
    const unsubscribe = taskEvents.subscribe(() => {
      fetchTasks().catch(() => { })
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
                  <div className={tasksViewStyles.cardTitleRow}>
                    <h2 className={tasksViewStyles.cardTitle}>{t.title}</h2>
                    <button
                      type="button"
                      className={tasksViewStyles.cardEditButton}
                      onClick={() => openEditor(t)}
                      aria-label={`Edit ${t.title}`}
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </div>
                  <span className={tasksViewStyles.cardMeta} aria-label="Estimated duration">
                    {t.estimated_duration || 0}m
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className={tasksViewStyles.cardDesc}>{t.description || "No description"}</p>
                <p className={tasksViewStyles.cardDue}>Due: {t.due_date ? new Date(t.due_date).toLocaleString() : 'No due date'}</p>
                <p className={tasksViewStyles.cardMeta}>Priority: {t.priority}</p>
                {t.difficulty && <p className={tasksViewStyles.cardMeta}>Difficulty: {t.difficulty}/10</p>}

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
      {editingTask && (
        <TaskEditSheet
          task={editingTask}
          open={isEditorOpen}
          onClose={closeEditor}
          onSaved={fetchTasks}
        />
      )}
    </section>
  )
}
