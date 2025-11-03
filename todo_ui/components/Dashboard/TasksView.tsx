"use client"
import { useEffect, useState } from "react"
import { useTaskStore } from "@/lib/store/useTaskStore"
import { useUserId } from "@/hooks/use-user-id"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { tasksViewStyles } from "./TasksView.styles"
import TaskDialog from "./TaskDialog"
import { Plus } from "lucide-react"

export default function TasksView() {
  const tasks = useTaskStore((s) => s.tasks) ?? []
  const fetchTasks = useTaskStore((s) => s.fetchTasks)
  const addTask = useTaskStore((s) => s.addTask)
  const userId = useUserId()
  const [openDialog, setOpenDialog] = useState(false)

  useEffect(() => {
    fetchTasks({}).catch(() => {})
  }, [fetchTasks, userId])

  return (
    <section className={tasksViewStyles.container} aria-labelledby="tasks-heading">
      <div className={tasksViewStyles.header}>
        <h1 id="tasks-heading" className={tasksViewStyles.title}>Your Tasks</h1>
        <button
          className={tasksViewStyles.createBtn}
          onClick={() => setOpenDialog(true)}
        >
          <Plus className="h-4 w-4 mr-2" /> Create Task
        </button>
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
              </CardContent>
            </Card>
          </article>
        ))}
      </div>
      {tasks.length === 0 && (
        <p className={tasksViewStyles.empty}>
          No tasks found. Click "Create Task" to add your first task
        </p>
      )}

      <TaskDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onSave={async (data) => {
          await addTask({
            user_id: userId,
            topic: data.topic,
            estimated_minutes: data.estimated_minutes,
            difficulty: data.difficulty,
            due_date: data.due_date,
            description: data.description,
            source_text: 'manual',
            confidence_score: 1.0
          } as any)
          setOpenDialog(false)
        }}
      />
    </section>
  )
}
