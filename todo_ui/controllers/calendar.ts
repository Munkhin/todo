// controllers/calendar.ts
import { supabase } from "@/lib/supabaseClient"

export default class CalendarController{
  static async loadEvents(userId: string) {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("user_id", userId)
    if (error) throw error
    return data
  }
}
