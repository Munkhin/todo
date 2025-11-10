// defines the schedule tab content

// installing controllers
import ModelResponseController from "@/controllers/model_response"
import CalendarController from "@/controllers/calendar"

// ui
import CalendarHeader from "../Schedule/CalendarHeader"
import Calendar from "../Schedule/Calendar"
import TaskDialog from "../Schedule/TaskDialog"
import ChatBar from "../Schedule/ChatBar"

import { useState } from "react"
import { useSession } from "next-auth/react"

export function ScheduleView(demo_mode?: boolean) {

    const [responseMessage, setResponseMessage] = useState<string | null>(null)
    const [calendarEvents, setCalendarEvents] = useState<any[]>([]) // needed for Calendar

    // get user id from auth
    const { data: session } = useSession()
    const userId = session?.user?.id || ""

    async function handleChatSubmit(query: string, file?: File) {
        // 1. send query to backend (AI + scheduling)
        const response = await ModelResponseController.call(query, userId, file)

        // 2. show any feedback message
        const text = ModelResponseController.extractText(response)
        setResponseMessage(text)

        // 3. reload calendar to reflect newly scheduled tasks
        await CalendarController.loadEvents(userId)
    }

    return (
        <div style={{ display: "grid", gridTemplateRows: "85% 15%", height: "100%" }}>
            <div>
                <CalendarHeader />
                <Calendar events={calendarEvents} />
                {responseMessage && <TaskDialog text={responseMessage} />}
            </div>
            <ChatBar onSubmit={handleChatSubmit} />
      </div>
    )
}