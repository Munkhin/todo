// defines the schedule tab content

// installing controllers
import ModelResponseController from "@/controllers/model_response"
import CalendarController from "@/controllers/calendar"
import CreditsController from "@/controllers/credits"

// ui
import CalendarHeader from "../Schedule/CalendarHeader"
import Calendar from "../Schedule/Calendar"
import TaskDialog from "../Schedule/TaskDialog"
import { ChatBar } from "../Schedule/ChatBar"

// state management utility functions
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { calculateUsagePercent } from "@/lib/utils"

export function ScheduleView() {

    // state management
    const [responseMessage, setResponseMessage] = useState<string | null>(null)
    const [calendarEvents, setCalendarEvents] = useState<any[]>([]) // needed for Calendar
    const [chatValue, setChatValue] = useState<string>("")
    const [usagePercent, setUsagePercent] = useState<number>(0)

    // get user id from auth
    const { data: session } = useSession()
    const userId = session?.user?.id || ""

    // fetch credit usage on mount
    useEffect(() => {
        if (userId) {
            fetchUsage()
        }
    }, [userId])

    // fetch usage for percentage display on the chatbox
    async function fetchUsage() {
        try {
            const { used, limit } = await CreditsController.getUsage(userId)
            setUsagePercent(calculateUsagePercent(used, limit))
        } catch (error) {
            console.error("Failed to fetch credit usage:", error)
        }
    }

    // handling sending via chatbox
    async function handleChatSubmit(query: string, file?: File) {
        // 1. send query to backend (AI + scheduling)
        const response = await ModelResponseController.call(query, userId, file)

        // 2. show any feedback message via task dialog
        const text = ModelResponseController.extractText(response)
        setResponseMessage(text)

        // 3. reload calendar to reflect newly scheduled tasks
        await CalendarController.loadEvents(userId)

        // 4. update credit usage
        await fetchUsage()

        // 5. clear chatbox once the message is sent
        setChatValue("")
    }

    return (
        // grid of 85% calendar+header and 15% chatbar
        <div style={{ display: "grid", gridTemplateRows: "85% 15%", height: "100%" }}>
            <div>
                <CalendarHeader />
                <Calendar events={calendarEvents} />
                {responseMessage && <TaskDialog text={responseMessage} />}
            </div>
            <ChatBar
                value={chatValue}
                onChange={setChatValue}
                onSubmit={handleChatSubmit}
                usagePercent={usagePercent}
            />
      </div>
    )
}