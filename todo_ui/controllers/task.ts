// controllers/task.ts
import { supabase } from "@/lib/supabaseClient"

export default class TaskController{
  async createTaskFromAI(aiText: string, userId: string) {
    const { data, error } = await supabase.from("tasks").insert([
      { user_id: userId, description: aiText },
    ])
    if (error) throw error
    return data
  }

  async listTasks(userId: string) {
    const { data, error } = await supabase.from("tasks").select("*").eq("user_id", userId)
    if (error) throw error
    return data
  }
}
