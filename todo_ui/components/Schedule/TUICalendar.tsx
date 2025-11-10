"use client"
// comprehensive calendar component using tui.calendar

import { useRef, useState, useCallback } from "react"
import Calendar from "@toast-ui/react-calendar"
import "@toast-ui/calendar/dist/toastui-calendar.min.css"
import type { EventObject } from "@toast-ui/calendar"

type CalendarView = "day" | "week" | "month"

interface TUICalendarProps {
    events?: EventObject[]
}

export default function TUICalendar({ events = [] }: TUICalendarProps) {
    const calendarRef = useRef<any>(null)
    const [view, setView] = useState<CalendarView>("week")
    const [dateRange, setDateRange] = useState("")

    // update date range display when calendar renders
    const handleAfterRenderEvent = useCallback(() => {
        const instance = calendarRef.current?.getInstance()
        if (instance) {
            const date = instance.getDate()
            const start = instance.getDateRangeStart()
            const end = instance.getDateRangeEnd()

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
        calendarRef.current?.getInstance()?.today()
        handleAfterRenderEvent()
    }

    const handlePrev = () => {
        calendarRef.current?.getInstance()?.prev()
        handleAfterRenderEvent()
    }

    const handleNext = () => {
        calendarRef.current?.getInstance()?.next()
        handleAfterRenderEvent()
    }

    const handleViewChange = (newView: CalendarView) => {
        setView(newView)
        handleAfterRenderEvent()
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

            {/* calendar component */}
            <div className="flex-1">
                <Calendar
                    ref={calendarRef}
                    height="100%"
                    view={view}
                    week={{
                        showTimezoneCollapseButton: false,
                        timezonesCollapsed: true,
                        eventView: true,
                        taskView: true,
                    }}
                    month={{
                        startDayOfWeek: 0,
                    }}
                    usageStatistics={false}
                    events={events}
                    onAfterRenderEvent={handleAfterRenderEvent}
                />
            </div>
        </div>
    )
}
