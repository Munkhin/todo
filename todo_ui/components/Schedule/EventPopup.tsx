"use client"
// custom event popup matching exact database schema

import React, { useState, useEffect } from "react"
import { Tag, MapPin, Calendar, Clock } from "lucide-react"
import type { CalendarEventType, CalendarEventPriority } from "@/lib/api/calendar"
import "./EventPopup.css"

export interface EventData {
  id?: number
  title: string
  description: string
  start_time: string
  end_time: string
  event_type: CalendarEventType
  priority: CalendarEventPriority
  task_id?: number
  source?: string
}

interface EventPopupProps {
  isOpen: boolean
  mode: 'create' | 'edit'
  eventData: EventData
  onSave: (data: EventData) => void
  onDelete?: () => void
  onClose: () => void
}

export default function EventPopup({
  isOpen,
  mode,
  eventData,
  onSave,
  onDelete,
  onClose
}: EventPopupProps) {
  const [formData, setFormData] = useState<EventData>(eventData)

  // sync form data when eventData prop changes
  useEffect(() => {
    setFormData(eventData)
  }, [eventData])

  if (!isOpen) return null

  // format datetime for input type="datetime-local"
  const formatDatetimeLocal = (isoString: string) => {
    if (!isoString) return ''
    return isoString.slice(0, 16) // YYYY-MM-DDTHH:mm
  }

  // handle form field changes
  const handleChange = (field: keyof EventData, value: string) => {
    setFormData({ ...formData, [field]: value })
  }

  // handle save button click
  const handleSave = () => {
    // convert datetime-local back to ISO string
    const dataToSave = {
      ...formData,
      start_time: formData.start_time.includes('T')
        ? new Date(formData.start_time).toISOString()
        : formData.start_time,
      end_time: formData.end_time.includes('T')
        ? new Date(formData.end_time).toISOString()
        : formData.end_time
    }
    onSave(dataToSave)
  }

  return (
    <div className="event-popup-overlay" onClick={onClose}>
      <div className="event-popup-container" onClick={(e) => e.stopPropagation()}>
        <div className="event-popup-header">
          <h3>{mode === 'create' ? 'Create Event' : 'Edit Event'}</h3>
          <button className="event-popup-close" onClick={onClose}>×</button>
        </div>

        <div className="event-popup-body">
          <div className="event-popup-field">
            <div className="event-popup-field-icon">
              <Tag size={18} />
            </div>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Subject"
              required
            />
          </div>

          <div className="event-popup-field">
            <div className="event-popup-field-icon">
              <MapPin size={18} />
            </div>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Location"
              rows={1}
            />
          </div>

          <div className="event-popup-row">
            <div className="event-popup-field">
              <div className="event-popup-field-icon">
                <Calendar size={18} />
              </div>
              <input
                id="start_time"
                type="datetime-local"
                value={formatDatetimeLocal(formData.start_time)}
                onChange={(e) => handleChange('start_time', e.target.value)}
                required
              />
            </div>

            <div className="event-popup-field">
              <div className="event-popup-field-icon">
                <Calendar size={18} />
              </div>
              <input
                id="end_time"
                type="datetime-local"
                value={formatDatetimeLocal(formData.end_time)}
                onChange={(e) => handleChange('end_time', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="event-popup-field">
            <div className="event-popup-field-icon">
              <Clock size={18} />
            </div>
            <select
              id="event_type"
              value={formData.event_type}
              onChange={(e) => handleChange('event_type', e.target.value as CalendarEventType)}
            >
              <option value="study">Study</option>
              <option value="break">Break</option>
              <option value="rest">Rest</option>
            </select>
          </div>
        </div>

        <div className="event-popup-footer">
          <button className="event-popup-btn event-popup-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          {mode === 'edit' && onDelete && (
            <button className="event-popup-btn event-popup-btn-delete" onClick={onDelete}>
              Delete
            </button>
          )}
          <button className="event-popup-btn event-popup-btn-save" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
