'use client'

import Link from "next/link"
import { useState } from "react"
import { Upload } from "lucide-react"

import { scheduleStyles } from "./schedule.styles"

export default function ScheduleSection() {
  const [inputValue, setInputValue] = useState("")
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    // File handling would be implemented here
  }

  return (
    <section id="schedule" className={scheduleStyles.section}>
      <h1 className={scheduleStyles.headline}>
        <div>Schedule <span className={scheduleStyles.neutralHighlight}>hundreds</span> of{" "}
        <span className={scheduleStyles.accentText}>tasks</span></div>
        <div className="mt-2">in <span className={scheduleStyles.underlineDark}>one click</span></div>
      </h1>

      <div className={scheduleStyles.sourcesContainer}>
        <div className="w-full max-w-2xl space-y-3">
          <p className="text-sm text-gray-600 text-center mb-4">
            Type your tasks or drag and drop files below. Our AI will extract and schedule everything for you.
          </p>

          <div
            className={`relative border-2 border-dashed rounded-xl transition-all duration-200 ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-300 bg-white hover:border-indigo-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="e.g., 'Finish project report by Friday, call dentist tomorrow at 2pm, review budget next week...'"
              className="w-full px-4 py-3 bg-transparent resize-none focus:outline-none text-gray-800 placeholder-gray-400 min-h-[120px]"
              rows={4}
            />

            <div className="absolute bottom-3 right-3 flex items-center gap-2 text-gray-400">
              <Upload size={18} />
              <span className="text-xs">Drop files here</span>
            </div>
          </div>
        </div>

        <Link href="/signup" className={scheduleStyles.scheduleButton}>
          Schedule Now
        </Link>
      </div>
    </section>
  )
}
