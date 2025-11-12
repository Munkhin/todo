"use client"
// tui.calendar implementation following official docs

import React, { useRef, useState, useCallback, useEffect } from "react"
import Calendar from "@toast-ui/calendar"
import "@toast-ui/calendar/dist/toastui-calendar.min.css"
import "tui-date-picker/dist/tui-date-picker.css"
import "tui-time-picker/dist/tui-time-picker.css"
import "./TUICalendar.css"
import type { EventObject } from "@toast-ui/calendar"

type CalendarView = "day" | "week" | "month"

interface TUICalendarProps {
    events?: EventObject[]
    onEventCreate?: (event: EventObject) => Promise<void>
    onEventUpdate?: (event: EventObject) => Promise<void>
    onEventDelete?: (eventId: string) => Promise<void>
}

export default function TUICalendar({
    events = [],
    onEventCreate,
    onEventUpdate,
    onEventDelete
}: TUICalendarProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const calendarInstanceRef = useRef<Calendar | null>(null)
    const [view, setView] = useState<CalendarView>("week")
    const [dateRange, setDateRange] = useState("")

    // initialize calendar instance per docs
    useEffect(() => {
        if (!containerRef.current) return

        // create calendar instance with options per docs
        const options = {
            defaultView: view,
            useFormPopup: true,
            useDetailPopup: true,
            usageStatistics: false,
            week: {
                showTimezoneCollapseButton: false,
                timezonesCollapsed: true,
                // show only time events, hide milestone/task panels to maximize timeline
                eventView: ['time'],
                taskView: false,
                // focus on core working hours for better space utilization
                hourStart: 6,
                hourEnd: 22,
            },
            month: {
                startDayOfWeek: 0,
            },
            // customize popup template to include priority, event_type, description
            template: {
                popupEdit: function() {
                    return `
                        <div class="custom-event-form">
                            <div class="form-group">
                                <label>Title</label>
                                <input type="text" name="title" class="form-control" />
                            </div>
                            <div class="form-group">
                                <label>Description</label>
                                <textarea name="body" class="form-control" rows="3"></textarea>
                            </div>
                            <div class="form-group">
                                <label>Event Type</label>
                                <select name="eventType" class="form-control">
                                    <option value="study">Study</option>
                                    <option value="break">Break</option>
                                    <option value="rest">Rest</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Priority</label>
                                <select name="priority" class="form-control">
                                    <option value="low">Low</option>
                                    <option value="medium" selected>Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Start</label>
                                <input type="datetime-local" name="start" class="form-control" />
                            </div>
                            <div class="form-group">
                                <label>End</label>
                                <input type="datetime-local" name="end" class="form-control" />
                            </div>
                        </div>
                    `;
                },
                popupDetailBody: function(event: EventObject) {
                    const raw = event.raw || {};
                    return `
                        <div class="event-details">
                            <div class="detail-row">
                                <strong>Title:</strong> ${event.title || 'Untitled'}
                            </div>
                            ${event.body ? `<div class="detail-row"><strong>Description:</strong> ${event.body}</div>` : ''}
                            <div class="detail-row">
                                <strong>Event Type:</strong> ${raw.eventType || 'study'}
                            </div>
                            <div class="detail-row">
                                <strong>Priority:</strong> ${raw.priority || 'medium'}
                            </div>
                            <div class="detail-row">
                                <strong>Time:</strong> ${event.start?.toLocaleString()} - ${event.end?.toLocaleString()}
                            </div>
                            ${raw.taskId ? `<div class="detail-row"><strong>Task ID:</strong> ${raw.taskId}</div>` : ''}
                            <div class="detail-row">
                                <strong>Source:</strong> ${raw.source || 'user'}
                            </div>
                        </div>
                    `;
                }
            }
        }

        calendarInstanceRef.current = new Calendar(containerRef.current, options)

        // set up event listeners for popup interactions only if handlers provided
        const calendar = calendarInstanceRef.current

        // handle event creation via popup
        if (onEventCreate) {
            calendar.on('beforeCreateEvent', async (eventData: any) => {
                await onEventCreate(eventData as EventObject)
            })
        }

        // handle event update via popup
        if (onEventUpdate) {
            calendar.on('beforeUpdateEvent', async ({ event, changes }: any) => {
                const updatedEvent = { ...event, ...changes }
                await onEventUpdate(updatedEvent as EventObject)
            })
        }

        // handle event deletion
        if (onEventDelete) {
            calendar.on('beforeDeleteEvent', async ({ event }: any) => {
                await onEventDelete(event.id)
            })
        }

        // add clickEvent listener for debugging
        calendar.on('clickEvent', ({ event }: any) => {
            console.log('Event clicked:', event.title)
        })

        updateDateRange()

        // cleanup on unmount
        return () => {
            calendarInstanceRef.current?.destroy()
        }
    }, [])

    // update events when they change using createEvents method per docs
    useEffect(() => {
        if (calendarInstanceRef.current) {
            calendarInstanceRef.current.clear()
            if (events.length > 0) {
                calendarInstanceRef.current.createEvents(events)
            }
        }
    }, [events])

    // update view when it changes
    useEffect(() => {
        if (calendarInstanceRef.current) {
            calendarInstanceRef.current.changeView(view)
            updateDateRange()
        }
    }, [view])

    // update date range display
    const updateDateRange = useCallback(() => {
        const instance = calendarInstanceRef.current
        if (instance) {
            // TUI Calendar returns TZDate objects, convert to native Date
            const toDate = (tzDate: any) => tzDate instanceof Date ? tzDate : new Date(tzDate)

            const date = toDate(instance.getDate())
            const start = toDate(instance.getDateRangeStart())
            const end = toDate(instance.getDateRangeEnd())

            if (view === "month") {
                setDateRange(`${date.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`)
            } else if (view === "week") {
                setDateRange(
                    `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                )
            } else {
                setDateRange(date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }))
            }
        }
    }, [view])

    // navigation handlers
    const handleToday = () => {
        calendarInstanceRef.current?.today()
        updateDateRange()
    }

    const handlePrev = () => {
        calendarInstanceRef.current?.prev()
        updateDateRange()
    }

    const handleNext = () => {
        calendarInstanceRef.current?.next()
        updateDateRange()
    }

    const handleViewChange = (newView: CalendarView) => {
        setView(newView)
    }

    return (
        <div className="flex flex-col h-full">
            {/* header controls */}
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold">Schedule</h2>
                    <span className="text-sm text-gray-600">{dateRange}</span>
                </div>

                <div className="flex items-center gap-2">
                    {/* navigation buttons */}
                    <button
                        onClick={handleToday}
                        className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
                    >
                        Today
                    </button>
                    <button
                        onClick={handlePrev}
                        className="px-2 py-1 border rounded hover:bg-gray-100"
                    >
                        &lt;
                    </button>
                    <button
                        onClick={handleNext}
                        className="px-2 py-1 border rounded hover:bg-gray-100"
                    >
                        &gt;
                    </button>

                    {/* view toggle buttons */}
                    <div className="flex border rounded ml-4">
                        <button
                            onClick={() => handleViewChange("day")}
                            className={`px-3 py-1 text-sm ${
                                view === "day" ? "bg-blue-500 text-white" : "hover:bg-gray-100"
                            }`}
                        >
                            Day
                        </button>
                        <button
                            onClick={() => handleViewChange("week")}
                            className={`px-3 py-1 text-sm border-x ${
                                view === "week" ? "bg-blue-500 text-white" : "hover:bg-gray-100"
                            }`}
                        >
                            Week
                        </button>
                        <button
                            onClick={() => handleViewChange("month")}
                            className={`px-3 py-1 text-sm ${
                                view === "month" ? "bg-blue-500 text-white" : "hover:bg-gray-100"
                            }`}
                        >
                            Month
                        </button>
                    </div>
                </div>
            </div>

            {/* calendar container - flex-1 allows it to take available space */}
            <div className="flex-1" style={{ minHeight: "400px" }}>
                <div ref={containerRef} style={{ height: "100%" }} />
            </div>
        </div>
    )
}
