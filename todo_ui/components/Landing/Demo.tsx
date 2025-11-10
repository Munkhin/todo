// demo version of schedule view with no backend calls

// ui
import CalendarHeader from "../Schedule/CalendarHeader"
import Calendar from "../Schedule/Calendar"
import { ChatBar } from "../Schedule/ChatBar"
import "../Schedule/TaskDialog.css"

import { useState } from "react"

export function Demo() {

    // state management
    const [showMessage, setShowMessage] = useState<boolean>(false)
    const [chatValue, setChatValue] = useState<string>("")

    // static demo events for calendar display
    const calendarEvents: any[] = []

    function handleChatSubmit() {
        // show hardcoded demo message with pricing CTA
        setShowMessage(true)

        // clear chatbox
        setChatValue("")
    }

    return (
        // grid of 85% calendar+header and 15% chatbar
        <div style={{ display: "grid", gridTemplateRows: "85% 15%", height: "100%" }}>
            <div>
                <CalendarHeader />
                <Calendar events={calendarEvents} />
                {showMessage && (
                    <div className="task-dialog-container">
                        <div className="task-dialog-box">
                            <p className="task-dialog-text">
                                Task scheduled successfully! This is a demo version - no actual scheduling occurred.
                                Ready to get started? <a href="#pricing" style={{ textDecoration: "underline" }}>Check out our pricing plans</a> to unlock full scheduling capabilities!
                            </p>
                        </div>
                    </div>
                )}
            </div>
            <ChatBar
                value={chatValue}
                onChange={setChatValue}
                onSubmit={handleChatSubmit}
            />
      </div>
    )
}
