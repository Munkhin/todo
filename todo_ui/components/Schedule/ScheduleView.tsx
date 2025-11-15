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
import EventPopup, { type EventData } from "../Schedule/EventPopup"
import "@toast-ui/calendar/dist/toastui-calendar.min.css"
import "./ScheduleView.css"

// state management utility functions
import { useUserId } from "@/hooks/use-user-id"
import { calculateUsagePercent } from "@/lib/utils"


export function ScheduleView() {

    // state management
    const [responseMessage, setResponseMessage] = useState<string | null>(null)
    const [calendarEvents, setCalendarEvents] = useState<any[]>([]) // needed for Calendar
    const [chatValue, setChatValue] = useState<string>("")
    const [usagePercent, setUsagePercent] = useState<number>(0)
    const [popupState, setPopupState] = useState<{
        isOpen: boolean
        mode: 'create' | 'edit'
        data: EventData
    }>({
        isOpen: false,
        mode: 'create',
        data: {
            title: '',
            description: '',
            start_time: '',
            end_time: '',
            event_type: 'study',
            priority: 'medium'
        }
    })

    // get user id from auth
    const userId = useUserId()

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
            const events = await CalendarController.loadEvents(String(userId))
            const tuiEvents = (events || []).map(toTUIEvent)
            setCalendarEvents(tuiEvents)
        } catch (error) {
            console.error("Failed to load calendar events:", error)
        }
    }

    // handle opening create popup with prefilled times
    function handleCreatePopupOpen({ start, end }: { start: string; end: string }) {
        setPopupState({
            isOpen: true,
            mode: 'create',
            data: {
                title: '',
                description: '',
                start_time: start,
                end_time: end,
                event_type: 'study',
                priority: 'medium'
            }
        })
    }

    // handle opening edit popup with full event data
    function handleEditPopupOpen(event: EventObject) {
        const eventData = fromTUIEvent(event)
        setPopupState({
            isOpen: true,
            mode: 'edit',
            data: {
                id: eventData.id,
                title: eventData.title || '',
                description: eventData.description || '',
                start_time: eventData.start_time || '',
                end_time: eventData.end_time || '',
                event_type: eventData.event_type || 'study',
                priority: eventData.priority || 'medium',
                task_id: eventData.task_id,
                source: eventData.source
            }
        })
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

    // handle saving event from popup
    async function handlePopupSave(data: EventData) {
        try {
            if (popupState.mode === 'create') {
                await createManualEvent({
                    user_id: userId || 0,
                    title: data.title,
                    description: data.description,
                    start_time: data.start_time,
                    end_time: data.end_time,
                    event_type: data.event_type,
                    priority: data.priority,
                })
            } else {
                if (data.id) {
                    await updateManualEvent(data.id, {
                        title: data.title,
                        description: data.description,
                        start_time: data.start_time,
                        end_time: data.end_time,
                        event_type: data.event_type,
                        priority: data.priority,
                    })
                }
            }
            await loadCalendarEvents()
            setPopupState({ ...popupState, isOpen: false })
        } catch (error) {
            console.error("Failed to save event:", error)
        }
    }

    // handle deleting event from popup
    async function handlePopupDelete() {
        try {
            if (popupState.data.id) {
                await deleteEvent(popupState.data.id)
                await loadCalendarEvents()
                setPopupState({ ...popupState, isOpen: false })
            }
        } catch (error) {
            console.error("Failed to delete event:", error)
        }
    }

    // handle closing popup
    function handlePopupClose() {
        setPopupState({ ...popupState, isOpen: false })
    }

    // fetch usage for percentage display on the chatbox
    async function fetchUsage() {
        try {
            const { used, limit } = await SubscriptionController.getUsage(String(userId))
            setUsagePercent(calculateUsagePercent(used, limit))
        } catch (error) {
            console.error("Failed to fetch credit usage:", error)
        }
    }

    // handling sending via chatbox
    async function handleChatSubmit(query: string, file?: File) {
        // 1. send query to backend (AI + scheduling)
        const response = await ModelResponseController.call(query, String(userId), file)

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
                    onEventUpdate={handleEventUpdate}
                    onEventDelete={handleEventDelete}
                    onCreatePopupOpen={handleCreatePopupOpen}
                    onEditPopupOpen={handleEditPopupOpen}
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
            <EventPopup
                isOpen={popupState.isOpen}
                mode={popupState.mode}
                eventData={popupState.data}
                onSave={handlePopupSave}
                onDelete={popupState.mode === 'edit' ? handlePopupDelete : undefined}
                onClose={handlePopupClose}
            />
        </div>
    )
}

export default ScheduleView