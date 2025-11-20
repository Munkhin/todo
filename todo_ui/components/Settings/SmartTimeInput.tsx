import React, { useState, useEffect } from 'react'
import { Input } from "@/components/ui/input"

interface SmartTimeInputProps {
    value: number
    onChange: (hour: number) => void
    label?: string
}

export default function SmartTimeInput({ value, onChange, label }: SmartTimeInputProps) {
    const [inputValue, setInputValue] = useState("")
    const [error, setError] = useState("")

    // Initialize input value from prop
    useEffect(() => {
        if (value !== undefined) {
            // Format 24h number to readable string (e.g. 6 -> "6:00 AM", 14 -> "2:00 PM")
            // For simplicity in this specific use case (wake/sleep hours), we can just show the number or a simple format
            // But the user wants to TYPE "6" or "6:15".
            // Let's just show the current value if the user hasn't typed anything yet?
            // Actually, let's just format it nicely on blur or init.
            const date = new Date()
            date.setHours(value, 0)
            // setInputValue(date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
            // Or just keep it simple for now, maybe just the number if it's an integer
            setInputValue(value.toString())
        }
    }, [value])

    const parseTime = (input: string): number | null => {
        const cleanInput = input.trim().toLowerCase()

        // Handle "6", "6am", "6 am"
        // Handle "6:00", "6:15"
        // Handle "18", "6pm"

        // Regex for simple number (0-23)
        if (/^([0-9]|1[0-9]|2[0-3])$/.test(cleanInput)) {
            return parseInt(cleanInput)
        }

        // Regex for time with colon
        const timeMatch = cleanInput.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/)
        if (timeMatch) {
            let hour = parseInt(timeMatch[1])
            const ampm = timeMatch[3]

            if (ampm === 'pm' && hour < 12) hour += 12
            if (ampm === 'am' && hour === 12) hour = 0

            if (hour >= 0 && hour <= 23) return hour
        }

        // Regex for simple number with am/pm
        const ampmMatch = cleanInput.match(/^(\d{1,2})\s*(am|pm)$/)
        if (ampmMatch) {
            let hour = parseInt(ampmMatch[1])
            const ampm = ampmMatch[2]

            if (ampm === 'pm' && hour < 12) hour += 12
            if (ampm === 'am' && hour === 12) hour = 0

            if (hour >= 0 && hour <= 23) return hour
        }

        return null
    }

    const handleBlur = () => {
        const parsed = parseTime(inputValue)
        if (parsed !== null) {
            onChange(parsed)
            setError("")
            // Optional: format the input value back to a standard format
            // setInputValue(parsed.toString()) 
        } else {
            // Revert to original value or show error
            // For now, let's just revert to the prop value
            setInputValue(value.toString())
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur()
        }
    }

    return (
        <div className="space-y-1">
            {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
            <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder="e.g. 7, 7:30, 7am"
                className={`w-full ${error ? 'border-red-500' : ''}`}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    )
}
