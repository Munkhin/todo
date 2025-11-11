"use client"
// dynamic wrapper for TUICalendar to prevent SSR issues

import React from "react"
import dynamic from "next/dynamic"
import type { EventObject } from "@toast-ui/calendar"

interface TUICalendarProps {
    events?: EventObject[]
    onEventCreate?: (event: EventObject) => Promise<void>
    onEventUpdate?: (event: EventObject) => Promise<void>
    onEventDelete?: (eventId: string) => Promise<void>
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
    onEventCreate,
    onEventUpdate,
    onEventDelete
}: TUICalendarProps) {
    return (
        <TUICalendar
            events={events}
            onEventCreate={onEventCreate}
            onEventUpdate={onEventUpdate}
            onEventDelete={onEventDelete}
        />
    )
}
