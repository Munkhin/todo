"use client"
// custom event popup matching exact database schema

import React, { useState, useEffect } from "react"
import { Tag, Calendar, Clock, FileText, Flag, ListTodo, Palette } from "lucide-react"
import type { CalendarEventType, CalendarEventPriority } from "@/lib/api/calendar"
import "./EventPopup.css"

const PRIORITY_OPTIONS: Array<{
  value: CalendarEventPriority
  label: string
  helper: string
}> = [
    { value: 'low', label: 'Low', helper: 'Keep flexible' },
    { value: 'medium', label: 'Medium', helper: 'Plan soon' },
    { value: 'high', label: 'High', helper: 'Must happen' },
  ]

const COLOR_OPTIONS: Array<{
  value: string
  label: string
}> = [
    { value: '#03bd9e', label: 'Teal' },
    { value: '#3b82f6', label: 'Blue' },
    { value: '#f97316', label: 'Orange' },
    { value: '#ec4899', label: 'Pink' },
    { value: '#8b5cf6', label: 'Purple' },
    { value: '#1f2937', label: 'Charcoal' },
  ]

const DEFAULT_COLOR = COLOR_OPTIONS[0].value

const sanitizeColorHex = (value?: string | null) => {
  if (!value) return DEFAULT_COLOR
  const trimmed = value.trim()
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) {
    return trimmed
  }
  if (/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) {
    return `#${trimmed}`
  }
  return DEFAULT_COLOR
}

export interface EventData {
  id?: number
  title: string
  description: string
  start_time: string
  end_time: string
  event_type: CalendarEventType
  priority: CalendarEventPriority
  color_hex?: string
  task_id?: number
  task_name?: string
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
  const normalizeEventData = (data: EventData): EventData => ({
    ...data,
    description: data.description || '',
    priority: (data.priority as CalendarEventPriority) || 'medium',
    color_hex: sanitizeColorHex(data.color_hex),
  })

  const [formData, setFormData] = useState<EventData>(normalizeEventData(eventData))

  // sync form data when eventData prop changes
  useEffect(() => {
    setFormData(normalizeEventData(eventData))
  }, [eventData])

  if (!isOpen) return null

  // format datetime for input type="datetime-local"
  // datetime-local expects local timezone, but our ISO strings are in UTC
  const formatDatetimeLocal = (isoString: string) => {
    if (!isoString) return ''
    const date = new Date(isoString) // Parse UTC ISO string
    if (Number.isNaN(date.getTime())) return ''
    // Adjust for timezone offset to get local time in YYYY-MM-DDTHH:mm format
    const offset = date.getTimezoneOffset()
    const localDate = new Date(date.getTime() - offset * 60000)
    return localDate.toISOString().slice(0, 16)
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
      color_hex: sanitizeColorHex(formData.color_hex),
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
          <div className="event-popup-task-label">
            <ListTodo size={16} />
            <span>{formData.task_name || (formData.task_id ? `Linked Task #${formData.task_id}` : 'Manual time block')}</span>
          </div>

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

          <div className="event-popup-field event-popup-field--stacked">
            <div className="event-popup-field-icon">
              <FileText size={18} />
            </div>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Description"
              rows={3}
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
              <option value="other">Other</option>
            </select>
          </div>

          <div className="event-popup-field event-popup-field--stacked">
            <div className="event-popup-field-icon">
              <Flag size={18} />
            </div>
            <div className="event-popup-priority">
              <div className="event-popup-priority-header">
                <span>Priority</span>
                <span className="event-popup-priority-value">
                  {PRIORITY_OPTIONS.find((opt) => opt.value === formData.priority)?.label || 'Select'}
                </span>
              </div>
              <div className="event-popup-priority-options">
                {PRIORITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`event-popup-priority-option ${formData.priority === option.value ? 'is-active' : ''}`}
                    onClick={() => handleChange('priority', option.value)}
                  >
                    <span className="event-popup-priority-option-label">{option.label}</span>
                    <span className="event-popup-priority-option-helper">{option.helper}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="event-popup-field event-popup-field--stacked">
            <div className="event-popup-field-icon">
              <Palette size={18} />
            </div>
            <div className="event-popup-color">
              <div className="event-popup-color-header">
                <span>Color</span>
                <span className="event-popup-color-value">
                  {COLOR_OPTIONS.find((opt) => opt.value === formData.color_hex)?.label || 'Custom'}
                </span>
              </div>
              <div className="event-popup-color-swatches">
                {COLOR_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`event-popup-color-swatch ${formData.color_hex === option.value ? 'is-active' : ''}`}
                    style={{ backgroundColor: option.value }}
                    onClick={() => handleChange('color_hex', option.value)}
                    aria-label={`Select ${option.label}`}
                  />
                ))}
              </div>
              <input
                className="event-popup-color-input"
                type="text"
                value={formData.color_hex}
                onChange={(e) => handleChange('color_hex', e.target.value)}
                placeholder="#03bd9e"
              />
            </div>
          </div>
        </div>

        <div className="event-popup-footer">
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

