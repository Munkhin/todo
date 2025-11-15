"use client"
// dynamic wrapper for TUICalendar to prevent SSR issues

import React from "react"
import dynamic from "next/dynamic"
import type { EventObject } from "@toast-ui/calendar"

interface TUICalendarProps {
    events?: EventObject[]
    onEventUpdate?: (event: EventObject) => Promise<void>
    onEventDelete?: (eventId: string) => Promise<void>
    onCreatePopupOpen?: (timeData: { start: string; end: string }) => void
    onEditPopupOpen?: (event: EventObject) => void
}

// dynamically import TUICalendar with no SSR
const TUICalendar = dynamic(() => import("./TUICalendar"), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading calendar...</div>
        </div>
    ),
})

export default function TUICalendarWrapper({
    events,
    onEventUpdate,
    onEventDelete,
    onCreatePopupOpen,
    onEditPopupOpen
}: TUICalendarProps) {
    return (
        <TUICalendar
            events={events}
            onEventUpdate={onEventUpdate}
            onEventDelete={onEventDelete}
            onCreatePopupOpen={onCreatePopupOpen}
            onEditPopupOpen={onEditPopupOpen}
        />
    )
}
