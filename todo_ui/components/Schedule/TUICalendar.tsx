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
    onEventUpdate?: (event: EventObject) => Promise<void>
    onEventDelete?: (eventId: string) => Promise<void>
    onCreatePopupOpen?: (timeData: { start: string; end: string }) => void
    onEditPopupOpen?: (event: EventObject) => void
}

export default function TUICalendar({
    events = [],
    onEventUpdate,
    onEventDelete,
    onCreatePopupOpen,
    onEditPopupOpen
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
            useFormPopup: false,
            useDetailPopup: false,
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
        }

        calendarInstanceRef.current = new Calendar(containerRef.current, options)

        // set up event listeners for custom popup
        const calendar = calendarInstanceRef.current

        // handle time selection for creating new events
        if (onCreatePopupOpen) {
            calendar.on('selectDateTime', (eventData: any) => {
                const normalizeISO = (value: any) => {
                    if (!value) return new Date().toISOString()
                    if (value instanceof Date) return value.toISOString()
                    if (typeof value.toDate === 'function') return value.toDate().toISOString()
                    return new Date(value).toISOString()
                }

                const startTime = normalizeISO(eventData.start)
                const endTime = normalizeISO(eventData.end)

                // hide the selection highlight so it feels like a modal workflow
                if (typeof calendar.clearGridSelections === 'function') {
                    calendar.clearGridSelections()
                } else if (eventData?.gridSelectionElements) {
                    eventData.gridSelectionElements.forEach((el: HTMLElement) => el.remove())
                }

                onCreatePopupOpen({
                    start: startTime,
                    end: endTime
                })
            })
        }

        // handle clicking existing event for editing
        if (onEditPopupOpen) {
            calendar.on('clickEvent', ({ event }: any) => {
                // open edit popup with full event data
                onEditPopupOpen(event as EventObject)
            })
        }

        // handle drag-and-drop time changes
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
