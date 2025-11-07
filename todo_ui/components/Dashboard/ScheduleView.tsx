"use client"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useTaskStore } from "@/lib/store/useTaskStore"
import { useSettingsStore } from "@/lib/store/useSettingsStore"
import { DEFAULT_WAKE_TIME, DEFAULT_SLEEP_TIME } from "@/lib/constants/scheduling"
import { useUserId } from "@/hooks/use-user-id"
import TaskDialog from "./TaskDialog"
import { useChatStore } from "@/lib/store/useChatStore"
import { uploadChatFile } from "@/lib/api/chat"
import { useScheduleStore } from "@/lib/store/useScheduleStore"
import { scheduleStyles as cal } from "@/components/Dashboard/ScheduleView.styles"
import type { CalendarEvent } from "@/lib/api/calendar"
import { startOfWeek, endOfWeek, addDays, formatWeekTitle, formatDayTitle, buildHoursSequence } from "@/lib/utils/calendar"
import { useTimeSelection } from "@/hooks/useTimeSelection"
import CalendarHeader from "./CalendarHeader"
import WeekView from "./WeekView"
import DayView from "./DayView"
import ChatBar from "./ChatBar"

type ScheduleViewProps = {
  demoMode?: boolean
  demoMaxMessages?: number
  pricingAnchor?: string
}

export default function ScheduleView({ demoMode = false, demoMaxMessages = 0, pricingAnchor = '#pricing' }: ScheduleViewProps) {
  // Store hooks
  const fetchTasks = useTaskStore((s) => s.fetchTasks)
  const addTask = useTaskStore((s) => s.addTask)
  const editTask = useTaskStore((s) => s.editTask)
  const removeTask = useTaskStore((s) => s.removeTask)
  const events = useScheduleStore((s) => s.events) ?? []
  const fetchEvents = useScheduleStore((s) => s.fetchEvents)
  const { sendMessage, isLoading } = useChatStore()

  // User and settings
  const userIdRaw = useUserId()
  const userId = userIdRaw ?? 0
  const wake = useSettingsStore((s) => s.settings.wake_time) ?? DEFAULT_WAKE_TIME
  const sleep = useSettingsStore((s) => s.settings.sleep_time) ?? DEFAULT_SLEEP_TIME
  const hoursSeq = useMemo(() => buildHoursSequence(wake, sleep), [wake, sleep])
  const spanHours = hoursSeq.length
  const spanMinutes = spanHours * 60

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'week' | 'day'>('week')

  // Dialog state
  const [openDialog, setOpenDialog] = useState(false)
  const [initialDueDate, setInitialDueDate] = useState<string | undefined>()
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null)
  const [editingTask, setEditingTask] = useState<any>(null)
  const [presetMinutes, setPresetMinutes] = useState<number | undefined>(undefined)

  // Chat state
  const [input, setInput] = useState("")
  const [notification, setNotification] = useState<ReactNode | null>(null)
  const [sentCount, setSentCount] = useState(0)
  const [uploading, setUploading] = useState(false)

  // Time selection hook
  const [selectionState, selectionHandlers] = useTimeSelection()

  // Unified refresh: tasks + calendar events for current view range
  const refreshViewData = async () => {
    if (demoMode || userId <= 0) return

    const start = view === 'week' ? startOfWeek(currentDate) : new Date(currentDate)
    start.setHours(0, 0, 0, 0)
    const end = view === 'week' ? endOfWeek(currentDate) : new Date(currentDate)
    if (view !== 'week') end.setHours(23, 59, 59, 999)

    await Promise.all([
      fetchTasks({ include_completed: false }),
      fetchEvents(start.toISOString(), end.toISOString(), userId)
    ])
  }

  useEffect(() => {
    if (demoMode) return
    if (userId <= 0) return
    refreshViewData().catch(() => {})
  }, [currentDate, view, userId])

  const handleEventClick = async (event: CalendarEvent) => {
    // If event has a linked task, fetch and edit it
    if (!event.task_id) {
      console.log('Event has no linked task:', event)
      return
    }

    // Fetch the task details
    const task = useTaskStore.getState().tasks.find(t => t.id === event.task_id)
    if (!task) {
      console.log('Task not found for event:', event)
      return
    }

    // Open dialog in edit mode with task data
    setEditingTaskId(task.id)
    setEditingTask(task)
    setInitialDueDate(task.due_date)
    setPresetMinutes(task.estimated_minutes)
    setOpenDialog(true)
  }

  const handleTimeSelect = (startMin: number, endMin: number, dayDate?: Date) => {
    const targetDate = dayDate || currentDate
    const startDate = new Date(targetDate)
    startDate.setHours(wake, 0, 0, 0)
    startDate.setMinutes(startDate.getMinutes() + startMin)

    const endDate = new Date(targetDate)
    endDate.setHours(wake, 0, 0, 0)
    endDate.setMinutes(endDate.getMinutes() + endMin)

    setInitialDueDate(endDate.toISOString())
    setPresetMinutes(endMin - startMin)
    setEditingTask(null)
    setEditingTaskId(null)
    setOpenDialog(true)
  }

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    if (demoMode) {
      if (sentCount >= (demoMaxMessages || 1)) {
        setNotification(
          <span>
            Demo limit reached. <a href={pricingAnchor} className="font-bold underline">Start scheduling now</a>
          </span>
        )
      } else {
        setSentCount(c => c + 1)
        setNotification(
          <span>
            This is a demo. <a href={pricingAnchor} className="font-bold underline">Sign up to start scheduling your tasks with AI!</a>
          </span>
        )
      }
      setInput("")
      return
    }

    if (userId <= 0) return

    const msg = input
    setInput("")
    try {
      const resp = await sendMessage(msg, userId)
      setNotification(resp)
      await refreshViewData()
      setTimeout(() => setNotification(null), 4000)
    } catch {
      setNotification("Failed to send. Please try again.")
      setTimeout(() => setNotification(null), 2500)
    }
  }

  const handleFileUpload = async (file: File) => {
    if (demoMode) {
      setNotification("File uploads are disabled in demo.")
      setTimeout(() => setNotification(null), 2500)
      return
    }

    if (userId <= 0) return

    try {
      setUploading(true)
      const res = await uploadChatFile(userId, file)
      setNotification(res.message || "File processed successfully.")
      setInput("Create tasks from my uploaded file")
      setTimeout(() => setNotification(null), 4000)
    } catch (err) {
      setNotification("Upload failed. Please try again.")
      setTimeout(() => setNotification(null), 2500)
    } finally {
      setUploading(false)
    }
  }

  const handleTaskSave = async (data: any) => {
    if (demoMode) {
      setOpenDialog(false)
      setEditingTaskId(null)
      setEditingTask(null)
      return
    }

    if (userId <= 0) return

    if (editingTaskId) {
      await editTask(String(editingTaskId), {
        topic: data.topic,
        estimated_minutes: data.estimated_minutes,
        difficulty: data.difficulty,
        due_date: data.due_date,
        description: data.description,
      })
    } else {
      const scheduledEnd = new Date(data.due_date)
      const scheduledStart = new Date(scheduledEnd.getTime() - data.estimated_minutes * 60000)
      await addTask({
        user_id: userId,
        topic: data.topic,
        estimated_minutes: data.estimated_minutes,
        difficulty: data.difficulty,
        due_date: data.due_date,
        description: data.description,
        source_text: 'dashboard-calendar',
        confidence_score: 1.0,
        scheduled_start: scheduledStart.toISOString(),
        scheduled_end: scheduledEnd.toISOString(),
        status: 'scheduled'
      } as any)
    }
    await refreshViewData()
    setOpenDialog(false)
    setEditingTaskId(null)
    setEditingTask(null)
  }

  const handleTaskDelete = async () => {
    if (!editingTaskId) return
    if (demoMode) {
      setOpenDialog(false)
      setEditingTaskId(null)
      setEditingTask(null)
      return
    }

    if (userId <= 0) return

    await removeTask(String(editingTaskId))
    await refreshViewData()
    setOpenDialog(false)
    setEditingTaskId(null)
    setEditingTask(null)
  }

  const currentEvents = demoMode ? [] : events
  const selectionBox = selectionHandlers.getSelectionBox(spanMinutes)

  return (
    <div className="min-h-0 h-full max-h-full overflow-hidden grid grid-rows-[85%_15%]">
      <section className={`${cal.page} min-h-0`} aria-label="Tasks Calendar">
        <CalendarHeader
          currentDate={currentDate}
          view={view}
          onPrev={() => setCurrentDate(addDays(currentDate, view === 'day' ? -1 : -7))}
          onNext={() => setCurrentDate(addDays(currentDate, view === 'day' ? 1 : 7))}
          onToday={() => setCurrentDate(new Date())}
          onViewChange={setView}
          formatTitle={view === 'week' ? formatWeekTitle : formatDayTitle}
        />

        <div className={cal.calendarArea}>
          {view === 'week' ? (
            <WeekView
              currentDate={currentDate}
              hoursSeq={hoursSeq}
              spanMinutes={spanMinutes}
              wake={wake}
              events={currentEvents}
              onEventClick={handleEventClick}
              onTimeSelect={(start, end, _dayIndex, dayDate) => handleTimeSelect(start, end, dayDate)}
              selectionBox={selectionBox}
              selectionDayIndex={selectionState.selectStartMin !== null ?
                (window as any).__selDayIndex : undefined}
              onMouseDown={(e, ref, span, idx) => {
                (window as any).__selDayIndex = idx
                selectionHandlers.onMouseDown(e, ref, span, idx)
              }}
              onMouseMove={selectionHandlers.onMouseMove}
              onMouseUp={selectionHandlers.onMouseUp}
            />
          ) : (
            <DayView
              currentDate={currentDate}
              hoursSeq={hoursSeq}
              spanMinutes={spanMinutes}
              wake={wake}
              events={currentEvents}
              onEventClick={handleEventClick}
              onTimeSelect={(start, end) => handleTimeSelect(start, end)}
              selectionBox={selectionBox}
              onMouseDown={selectionHandlers.onMouseDown}
              onMouseMove={selectionHandlers.onMouseMove}
              onMouseUp={selectionHandlers.onMouseUp}
              onMouseLeave={selectionHandlers.onMouseLeave}
            />
          )}

          {/* Floating model response overlay */}
          {notification && (
            <div className={cal.overlayWrap}>
              <div className={cal.overlayBubble}>{notification}</div>
            </div>
          )}
        </div>

        <TaskDialog
          open={openDialog}
          onClose={() => {
            setOpenDialog(false)
            setEditingTaskId(null)
            setEditingTask(null)
          }}
          isEditMode={!!editingTaskId}
          initialTopic={editingTask?.topic}
          initialEstimatedMinutes={editingTask?.estimated_minutes ?? presetMinutes}
          initialDifficulty={editingTask?.difficulty}
          initialDueDate={initialDueDate}
          initialDescription={editingTask?.description}
          onSave={handleTaskSave}
          onDelete={editingTaskId ? handleTaskDelete : undefined}
        />
      </section>

      {/* Bottom chat bar in second row (15%) */}
      <ChatBar
        input={input}
        setInput={setInput}
        onSubmit={handleChatSubmit}
        onFileUpload={handleFileUpload}
        isLoading={isLoading}
        uploading={uploading}
        demoMode={demoMode}
        sentCount={sentCount}
        demoMaxMessages={demoMaxMessages}
      />
    </div>
  )
}
