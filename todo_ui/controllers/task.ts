// controllers/task.ts
import { createTask, listTasks } from "@/lib/api/tasks"

export default class TaskController {
  async createTaskFromAI(aiText: string, userId: string) {
    const data = await createTask({
      user_id: Number(userId),
      title: aiText,
      estimated_duration: 60,
      priority: "medium",
      due_date: new Date().toISOString(),
      description: "",
    })
    return data
  }

  async listTasks(userId: string) {
    const { tasks } = await listTasks()
    return tasks
  }
}
