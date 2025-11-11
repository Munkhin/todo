"use client"
// defines the schedule tab content

import React, { useState, useEffect } from "react"

// installing controllers
import ModelResponseController from "@/controllers/model_response"
import CalendarController from "@/controllers/calendar"
import SubscriptionController from "@/controllers/subscription"

// event mapper
import { toTUIEvent, fromTUIEvent } from "@/lib/mappers/calendarEventMapper"
import { createManualEvent, updateManualEvent, deleteEvent } from "@/lib/api/calendar"
import type { EventObject } from "@toast-ui/calendar"

// ui
import TUICalendar from "../Schedule/TUICalendarWrapper"
import TaskDialog from "../Schedule/TaskDialog"
import { ChatBar } from "../Schedule/ChatBar"
import "@toast-ui/calendar/dist/toastui-calendar.min.css"
import "./ScheduleView.css"

// state management utility functions
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

    // fetch credit usage and calendar events on mount
    useEffect(() => {
        if (userId) {
            fetchUsage()
            loadCalendarEvents()
        }
    }, [userId])

    // load calendar events and transform to TUI format
    async function loadCalendarEvents() {
        try {
            const events = await CalendarController.loadEvents(userId)
            const tuiEvents = (events || []).map(toTUIEvent)
            setCalendarEvents(tuiEvents)
        } catch (error) {
            console.error("Failed to load calendar events:", error)
        }
    }

    // handle event creation from popup
    async function handleEventCreate(event: EventObject) {
        try {
            const eventData = fromTUIEvent(event)
            await createManualEvent({
                user_id: Number(userId),
                title: eventData.title || '',
                start_time: eventData.start_time || '',
                end_time: eventData.end_time || '',
                event_type: eventData.event_type,
            })
            await loadCalendarEvents()
        } catch (error) {
            console.error("Failed to create event:", error)
        }
    }

    // handle event update from popup
    async function handleEventUpdate(event: EventObject) {
        try {
            const eventData = fromTUIEvent(event)
            if (eventData.id) {
                await updateManualEvent(eventData.id, {
                    title: eventData.title,
                    start_time: eventData.start_time,
                    end_time: eventData.end_time,
                    event_type: eventData.event_type,
                })
                await loadCalendarEvents()
            }
        } catch (error) {
            console.error("Failed to update event:", error)
        }
    }

    // handle event deletion from popup
    async function handleEventDelete(eventId: string) {
        try {
            await deleteEvent(Number(eventId))
            await loadCalendarEvents()
        } catch (error) {
            console.error("Failed to delete event:", error)
        }
    }

    // fetch usage for percentage display on the chatbox
    async function fetchUsage() {
        try {
            const { used, limit } = await SubscriptionController.getUsage(userId)
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
        await loadCalendarEvents()

        // 4. update credit usage
        await fetchUsage()

        // 5. clear chatbox once the message is sent
        setChatValue("")
    }

    return (
        <div className="schedule-view-container">
            <div className="schedule-view-calendar-wrapper">
                <TUICalendar
                    events={calendarEvents}
                    onEventCreate={handleEventCreate}
                    onEventUpdate={handleEventUpdate}
                    onEventDelete={handleEventDelete}
                />
                {responseMessage && <TaskDialog text={responseMessage} />}
            </div>
            <div className="schedule-view-chat-wrapper">
                <ChatBar
                    value={chatValue}
                    onChange={setChatValue}
                    onSubmit={handleChatSubmit}
                    usagePercent={usagePercent}
                />
            </div>
        </div>
    )
}

export default ScheduleView