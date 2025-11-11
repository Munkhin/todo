"use client"
// demo version of schedule view with no backend calls

// ui
import TUICalendar from "../Schedule/TUICalendarWrapper"
import { ChatBar } from "../Schedule/ChatBar"
import "../Schedule/TaskDialog.css"
import "./Demo.css"

import { useState } from "react"

export function Demo() {

    // state management
    const [showMessage, setShowMessage] = useState<boolean>(false)
    const [chatValue, setChatValue] = useState<string>("")

    // static demo events for calendar display with varying colors
    const calendarEvents: any[] = [
        {
            id: 'demo1',
            calendarId: 'study',
            title: 'Morning Study Session',
            start: '2025-11-11T08:00:00',
            end: '2025-11-11T10:00:00',
            category: 'time',
            backgroundColor: '#03bd9e',
            color: '#ffffff',
            borderColor: '#03bd9e',
        },
        {
            id: 'demo2',
            calendarId: 'meeting',
            title: 'Team Standup',
            start: '2025-11-11T10:30:00',
            end: '2025-11-11T11:00:00',
            category: 'time',
            backgroundColor: '#00a9ff',
            color: '#ffffff',
            borderColor: '#00a9ff',
        },
        {
            id: 'demo3',
            calendarId: 'break',
            title: 'Lunch Break',
            start: '2025-11-11T12:00:00',
            end: '2025-11-11T13:00:00',
            category: 'time',
            backgroundColor: '#ffa500',
            color: '#ffffff',
            borderColor: '#ffa500',
        },
        {
            id: 'demo4',
            calendarId: 'work',
            title: 'Project Development',
            start: '2025-11-11T14:00:00',
            end: '2025-11-11T17:00:00',
            category: 'time',
            backgroundColor: '#9b59b6',
            color: '#ffffff',
            borderColor: '#9b59b6',
        },
        {
            id: 'demo5',
            calendarId: 'exercise',
            title: 'Gym Workout',
            start: '2025-11-12T07:00:00',
            end: '2025-11-12T08:30:00',
            category: 'time',
            backgroundColor: '#e74c3c',
            color: '#ffffff',
            borderColor: '#e74c3c',
        },
        {
            id: 'demo6',
            calendarId: 'study',
            title: 'Review Notes',
            start: '2025-11-12T15:00:00',
            end: '2025-11-12T16:30:00',
            category: 'time',
            backgroundColor: '#03bd9e',
            color: '#ffffff',
            borderColor: '#03bd9e',
        },
        {
            id: 'demo7',
            calendarId: 'meeting',
            title: 'Client Call',
            start: '2025-11-13T11:00:00',
            end: '2025-11-13T12:00:00',
            category: 'time',
            backgroundColor: '#00a9ff',
            color: '#ffffff',
            borderColor: '#00a9ff',
        },
        {
            id: 'demo8',
            calendarId: 'personal',
            title: 'Doctor Appointment',
            start: '2025-11-14T09:30:00',
            end: '2025-11-14T10:30:00',
            category: 'time',
            backgroundColor: '#f39c12',
            color: '#ffffff',
            borderColor: '#f39c12',
        },
    ]

    function handleChatSubmit() {
        // show hardcoded demo message with pricing CTA
        setShowMessage(true)

        // clear chatbox
        setChatValue("")
    }

    return (
        // grid of 85% calendar and 15% chatbar
        <div id="demo" className="demo-container">
            <div className="demo-content-wrapper">
                <div className="demo-calendar-wrapper">
                    <div className="demo-calendar-inner">
                        <TUICalendar events={calendarEvents} />
                        {showMessage && (
                            <div className="task-dialog-container">
                                <div className="task-dialog-box">
                                    <p className="task-dialog-text">
                                        Demo mode - no actual scheduling. <a href="#pricing" className="demo-link">Start now</a> to unlock full features!
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="demo-chatbar-wrapper">
                    <div className="demo-chatbar-inner">
                        <ChatBar
                            value={chatValue}
                            onChange={setChatValue}
                            onSubmit={handleChatSubmit}
                        />
                    </div>
                </div>
            </div>
      </div>
    )
}

export default Demo
