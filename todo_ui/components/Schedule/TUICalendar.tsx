"use client"
// comprehensive calendar component using vanilla tui.calendar (not React wrapper)

import React, { useRef, useState, useCallback, useEffect } from "react"
import Calendar from "@toast-ui/calendar"
import "@toast-ui/calendar/dist/toastui-calendar.min.css"
import type { EventObject } from "@toast-ui/calendar"

type CalendarView = "day" | "week" | "month"

interface TUICalendarProps {
    events?: EventObject[]
}

export default function TUICalendar({ events = [] }: TUICalendarProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const calendarInstanceRef = useRef<Calendar | null>(null)
    const [view, setView] = useState<CalendarView>("week")
    const [dateRange, setDateRange] = useState("")

    // initialize vanilla calendar instance
    useEffect(() => {
        if (!containerRef.current) return

        // create vanilla calendar instance
        calendarInstanceRef.current = new Calendar(containerRef.current, {
            defaultView: view,
            useFormPopup: false,
            useDetailPopup: false,
            week: {
                showTimezoneCollapseButton: false,
                timezonesCollapsed: true,
                eventView: true,
                taskView: true,
            },
            month: {
                startDayOfWeek: 0,
            },
            usageStatistics: false,
        })

        updateDateRange()

        // cleanup on unmount
        return () => {
            calendarInstanceRef.current?.destroy()
        }
    }, [])

    // update events when they change
    useEffect(() => {
        if (calendarInstanceRef.current && events) {
            calendarInstanceRef.current.clear()
            calendarInstanceRef.current.createEvents(events)
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

            {/* calendar container */}
            <div className="flex-1">
                <div ref={containerRef} style={{ height: "100%" }} />
            </div>
        </div>
    )
}
