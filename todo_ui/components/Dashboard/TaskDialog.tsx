"use client"
import { useState, useEffect } from "react"
import { taskDialogStyles } from "./TaskDialog.styles"

export interface TaskDialogProps {
  open: boolean
  onClose: () => void
  onSave: (data: {
    topic: string
    estimated_minutes: number
    difficulty: number
    due_date: string
    description?: string
  }) => Promise<void>
  onDelete?: () => Promise<void>
  isEditMode?: boolean
  initialTopic?: string
  initialEstimatedMinutes?: number
  initialDifficulty?: number
  initialDueDate?: string
  initialDescription?: string
}

// Convert ISO string to datetime-local format (YYYY-MM-DDTHH:mm)
function isoToLocal(iso: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

// Convert datetime-local format to ISO string
function localToIso(local: string): string {
  if (!local) return ''
  return new Date(local).toISOString()
}

export default function TaskDialog({
  open,
  onClose,
  onSave,
  onDelete,
  isEditMode = false,
  initialTopic = '',
  initialEstimatedMinutes = 60,
  initialDifficulty = 3,
  initialDueDate = '',
  initialDescription = ''
}: TaskDialogProps) {
  const [topic, setTopic] = useState(initialTopic)
  const [estimatedMinutes, setEstimatedMinutes] = useState(initialEstimatedMinutes)
  const [difficulty, setDifficulty] = useState(initialDifficulty)
  // Represent start/end as datetime-local strings for editing
  const computeStartFromEnd = (endIso: string, minutes: number) => {
    if (!endIso || !minutes) return ''
    const end = new Date(endIso)
    const start = new Date(end.getTime() - minutes * 60000)
    return isoToLocal(start.toISOString())
  }
  const [startLocal, setStartLocal] = useState(
    computeStartFromEnd(initialDueDate, initialEstimatedMinutes)
  )
  const [endLocal, setEndLocal] = useState(isoToLocal(initialDueDate))
  const [description, setDescription] = useState(initialDescription)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Update local state when props change
  useEffect(() => {
    setTopic(initialTopic)
    setEstimatedMinutes(initialEstimatedMinutes)
    setDifficulty(initialDifficulty)
    setStartLocal(computeStartFromEnd(initialDueDate, initialEstimatedMinutes))
    setEndLocal(isoToLocal(initialDueDate))
    setDescription(initialDescription)
  }, [initialTopic, initialEstimatedMinutes, initialDifficulty, initialDueDate, initialDescription])

  // Helpers for datetime-local arithmetic
  function addMinutesLocal(local: string, minutes: number): string {
    if (!local) return ''
    const d = new Date(local)
    d.setMinutes(d.getMinutes() + minutes)
    return isoToLocal(d.toISOString())
  }
  function diffMinutesLocal(start: string, end: string): number {
    if (!start || !end) return 0
    const s = new Date(start)
    const e = new Date(end)
    return Math.max(0, Math.round((e.getTime() - s.getTime()) / 60000))
  }

  if (!open) return null

  return (
    <div className={taskDialogStyles.dialog} role="dialog" aria-modal="true" aria-labelledby="task-dialog-title">
      <div className={taskDialogStyles.overlay} onClick={onClose} />
      <article className={taskDialogStyles.panel}>
        <header className={taskDialogStyles.header} id="task-dialog-title">
          {isEditMode ? 'Edit Task' : 'Create Task'}
        </header>
        <div className={taskDialogStyles.body}>
          <label className={taskDialogStyles.label}>
            Task Name
            <input
              className={taskDialogStyles.input}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </label>
          <label className={taskDialogStyles.label}>
            Estimated Time (minutes)
            <input
              type="number"
              className={taskDialogStyles.input}
              value={estimatedMinutes}
              onChange={(e) => {
                const val = Math.max(1, Number(e.target.value) || 0)
                setEstimatedMinutes(val)
                // Adjust end when duration changes
                setEndLocal(addMinutesLocal(startLocal, val))
              }}
              min="1"
            />
          </label>
          <label className={taskDialogStyles.label}>
            Difficulty (1-5)
            <input
              type="number"
              className={taskDialogStyles.input}
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              min="1"
              max="5"
            />
          </label>
          <label className={taskDialogStyles.label}>
            Start Time
            <input
              type="datetime-local"
              className={taskDialogStyles.input}
              value={startLocal}
              onChange={(e) => {
                const nextStart = e.target.value
                setStartLocal(nextStart)
                // Keep duration by moving end relative to new start
                setEndLocal(addMinutesLocal(nextStart, estimatedMinutes))
              }}
            />
          </label>
          <label className={taskDialogStyles.label}>
            End Time
            <input
              type="datetime-local"
              className={taskDialogStyles.input}
              value={endLocal}
              onChange={(e) => {
                const nextEnd = e.target.value
                setEndLocal(nextEnd)
                // Recalculate duration from start and end
                const diff = diffMinutesLocal(startLocal, nextEnd)
                setEstimatedMinutes(Math.max(1, diff))
              }}
            />
          </label>
          <label className={taskDialogStyles.label}>
            Description (Optional)
            <textarea
              className={taskDialogStyles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details about this task"
              rows={3}
            />
          </label>
        </div>
        <footer className={taskDialogStyles.footer}>
          <button className={taskDialogStyles.cancel} onClick={onClose}>Cancel</button>
          <button
            className={taskDialogStyles.save}
            disabled={!topic.trim() || !startLocal || !endLocal || diffMinutesLocal(startLocal, endLocal) <= 0 || saving}
            onClick={async () => {
              setSaving(true)
              await onSave({
                topic,
                estimated_minutes: Math.max(1, diffMinutesLocal(startLocal, endLocal)),
                difficulty,
                due_date: localToIso(endLocal),
                description: description || undefined
              })
              setSaving(false)
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {onDelete && (
            <button
              className={taskDialogStyles.cancel}
              onClick={async () => {
                setDeleting(true)
                await onDelete()
                setDeleting(false)
              }}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          )}
        </footer>
      </article>
    </div>
  )
}
