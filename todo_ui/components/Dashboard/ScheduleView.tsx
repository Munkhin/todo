"use client"
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { ChevronLeft, ChevronRight, Paperclip } from "lucide-react"
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
import { demoListEventsInRange, demoCreateTask, demoUpdateTask, demoDeleteTask, demoSendMessage } from "@/lib/demo/localDemo"

// Visual scale: pixels per hour and minute
const PX_PER_HOUR = 48
const PX_PER_MIN = PX_PER_HOUR / 60

type ScheduleViewProps = {
  demoMode?: boolean
  demoMaxMessages?: number
  pricingAnchor?: string
}

export default function ScheduleView({ demoMode = false, demoMaxMessages = 0, pricingAnchor = '#pricing' }: ScheduleViewProps) {
  const tasks = useTaskStore((s) => s.tasks) ?? []
  const fetchTasks = useTaskStore((s) => s.fetchTasks)
  const addTask = useTaskStore((s) => s.addTask)
  const editTask = useTaskStore((s) => s.editTask)
  const removeTask = useTaskStore((s) => s.removeTask)
  const events = useScheduleStore((s) => s.events) ?? []
  const fetchEvents = useScheduleStore((s) => s.fetchEvents)
  const userId = useUserId()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'week' | 'day'>('week')
  const [openDialog, setOpenDialog] = useState(false)
  const [initialDueDate, setInitialDueDate] = useState<string | undefined>()
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null)
  const [editingTask, setEditingTask] = useState<any>(null)
  const [presetMinutes, setPresetMinutes] = useState<number | undefined>(undefined)
  const gridRef = useRef<HTMLDivElement>(null)
  const dayHoursRef = useRef<HTMLDivElement>(null)
  const weekHoursRefs = useRef<(HTMLDivElement | null)[]>([])

  // pointer interaction state
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectStartMin, setSelectStartMin] = useState<number | null>(null)
  const [selectEndMin, setSelectEndMin] = useState<number | null>(null)

  // wake/sleep bounds from settings
  const wake = useSettingsStore((s) => s.settings.wake_time) ?? DEFAULT_WAKE_TIME
  const sleep = useSettingsStore((s) => s.settings.sleep_time) ?? DEFAULT_SLEEP_TIME
  const hoursSeq = useMemo(() => buildHoursSequence(wake, sleep), [wake, sleep])
  const spanHours = hoursSeq.length
  const spanMinutes = spanHours * 60
  // chat input state
  const { sendMessage, isLoading } = useChatStore()
  const [input, setInput] = useState("")
  const [notification, setNotification] = useState<ReactNode | null>(null)
  const [sentCount, setSentCount] = useState(0)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [demoEvents, setDemoEvents] = useState<CalendarEvent[]>([])

  // unified refresh: tasks + calendar events for current view range
  const refreshViewData = async () => {
    const start = view === 'week' ? startOfWeek(currentDate) : new Date(currentDate)
    start.setHours(0, 0, 0, 0)
    const end = view === 'week' ? endOfWeek(currentDate) : new Date(currentDate)
    if (view !== 'week') end.setHours(23, 59, 59, 999)

    if (demoMode) {
      const ev = await demoListEventsInRange(start.toISOString(), end.toISOString())
      setDemoEvents(ev)
    } else {
      await Promise.all([
        fetchTasks({ include_completed: false }),
        fetchEvents(start.toISOString(), end.toISOString(), userId)
      ])
    }
  }

  useEffect(() => {
    // initial load and keep events in sync as date/view changes
    refreshViewData().catch(() => {})
  }, [currentDate, view, userId])

  const handleEventClick = (event: any) => {
    // For now, just show event info - future: allow editing events
    console.log('Event clicked:', event)
  }

  return (
    <div className="min-h-0 h-full max-h-full overflow-hidden grid grid-rows-[85%_15%]">
    <section className={`${cal.page} min-h-0`} aria-label="Tasks Calendar">
      <div className={cal.calHeader}>
        <div className={cal.calHeaderLeft}>
          <button className={cal.navBtn} onClick={() => setCurrentDate(addDays(currentDate, view === 'day' ? -1 : -7))}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className={cal.calTitle}>
            {view === 'week' ? formatWeekTitle(currentDate) : formatDayTitle(currentDate)}
          </div>
          <button className={cal.navBtn} onClick={() => setCurrentDate(addDays(currentDate, view === 'day' ? 1 : 7))}>
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className={cal.calHeaderRight}>
          <div className={cal.viewToggle} role="tablist" aria-label="View toggle">
            <button role="tab" aria-selected={view === 'week'} className={cal.viewBtn} onClick={() => setView('week')}>Week</button>
            <button role="tab" aria-selected={view === 'day'} className={cal.viewBtn} onClick={() => setView('day')}>Day</button>
          </div>
          <button className={cal.todayBtn} onClick={() => setCurrentDate(new Date())}>Today</button>
        </div>
      </div>

      <div className={cal.calendarArea}>
        {view === 'week' ? (
          <div className={cal.weekOuterGrid}>
            {/* Left time column */}
            <div className={cal.timeCol}>
              {hoursSeq.map((h, idx) => (
                <div key={idx} className={cal.timeLabel} style={{ height: PX_PER_HOUR }}>{formatHour(h)}</div>
              ))}
            </div>
            {/* Right: headers + 7 day columns */}
            <div className="min-h-0 flex flex-col">
              <div className={cal.weekHeader}>
                {getWeekDates(currentDate).map((dayDate, i) => (
                  <div key={i} className={cal.weekHeaderCell}>
                    {dayDate.toLocaleDateString('en-US', { weekday: 'short' })} {dayDate.getDate()}
                  </div>
                ))}
              </div>
              <div ref={gridRef} className={cal.weekGrid}>
                {getWeekDates(currentDate).map((dayDate, i) => (
                  <div key={i} className={`${cal.dayCell} ${isSameDate(dayDate, new Date()) ? cal.dayCellToday : ''}`}>
                    <div
                      ref={(el) => { (weekHoursRefs as any).current[i] = el }}
                      className={cal.weekHours}
                      style={{ height: `${spanHours * PX_PER_HOUR}px` }}
                      onMouseDown={(e) => {
                        const min = yToMinutes(e.clientY, (weekHoursRefs as any).current[i], spanMinutes)
                        const snapped = snap15(min)
                        setIsSelecting(true)
                        setSelectStartMin(snapped)
                        setSelectEndMin(snapped + 60)
                        ;(window as any).__selDayIndex = i
                      }}
                      onMouseMove={(e) => {
                        if (!isSelecting) return
                        const idx = (window as any).__selDayIndex ?? i
                        const min = yToMinutes(e.clientY, (weekHoursRefs as any).current[idx], spanMinutes)
                        setSelectEndMin(snap15(min))
                      }}
                      onMouseUp={() => {
                        if (!isSelecting) return
                        const start = Math.min(selectStartMin ?? 0, selectEndMin ?? 0)
                        const end = Math.max(selectStartMin ?? 0, selectEndMin ?? 0)
                        const startDayIndex = (window as any).__selDayIndex ?? i
                        const day = getWeekDates(currentDate)[startDayIndex]
                        const baseHour = wake
                        const startDate = new Date(day)
                        startDate.setHours(baseHour, 0, 0, 0)
                        startDate.setMinutes(startDate.getMinutes() + start)
                        const endDate = new Date(day)
                        endDate.setHours(baseHour, 0, 0, 0)
                        const finalEndMin = Math.max(start + 15, end)
                        endDate.setMinutes(endDate.getMinutes() + finalEndMin)
                        setInitialDueDate(endDate.toISOString())
                        setPresetMinutes(finalEndMin - start)
                        setEditingTask(null)
                        setEditingTaskId(null)
                        setOpenDialog(true)
                        setIsSelecting(false)
                      }}
                    >
                      {hoursSeq.map((_, idx) => (
                        <div key={idx} className={cal.weekHourRow} style={{ height: PX_PER_HOUR }} />
                      ))}

                      {isSameDate(dayDate, new Date()) && (
                        <div className={cal.nowLine} style={{ top: `${getNowOffsetPx(wake, spanMinutes)}px` }} />
                      )}

                      {(demoMode ? demoEvents : events)
                        .filter(evt => isSameDate(new Date(evt.start_time), dayDate))
                        .map((evt) => {
                          const { top, height } = getEventBox(evt.start_time, evt.end_time, wake, spanMinutes)
                          return (
                            <div
                              key={evt.id}
                              className={cal.eventDay}
                              style={{ top, height }}
                              onClick={() => handleEventClick(evt)}
                            >
                              {evt.title}
                            </div>
                          )
                        })}

                      {isSelecting && (window as any).__selDayIndex === i && selectStartMin !== null && selectEndMin !== null && (
                        (() => {
                          const top = Math.min(selectStartMin, selectEndMin) * PX_PER_MIN
                          const height = Math.max(16, Math.abs(selectEndMin - selectStartMin) * PX_PER_MIN)
                          return <div className={cal.selectionBox} style={{ top, height }} />
                        })()
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className={cal.dayArea}>
              <div className={cal.dayGrid}>
              <div className={cal.timeCol}>
                {hoursSeq.map((h, idx) => (
                  <div key={idx} className={cal.timeLabel} style={{ height: PX_PER_HOUR }}>{formatHour(h)}</div>
                ))}
              </div>
              <div className={cal.dayCol}>
                <div
                  ref={dayHoursRef}
                  className={cal.dayHours}
                  style={{ height: `${spanHours * PX_PER_HOUR}px` }}
                  onMouseDown={(e) => {
                    const min = yToMinutes(e.clientY, dayHoursRef.current, spanMinutes)
                    const snapped = snap15(min)
                    setIsSelecting(true)
                    setSelectStartMin(snapped)
                    setSelectEndMin(snapped + 60)
                  }}
                  onMouseMove={(e) => {
                    if (!isSelecting) return
                    const min = yToMinutes(e.clientY, dayHoursRef.current, spanMinutes)
                    setSelectEndMin(snap15(min))
                  }}
                  onMouseUp={() => {
                    if (!isSelecting) return
                    const start = Math.min(selectStartMin ?? 0, selectEndMin ?? 0)
                    const end = Math.max(selectStartMin ?? 0, selectEndMin ?? 0)
                    const dueDateTime = new Date(currentDate)
                    const baseHour = wake
                    const startDate = new Date(dueDateTime)
                    startDate.setHours(baseHour, 0, 0, 0)
                    startDate.setMinutes(startDate.getMinutes() + start)
                    const endDate = new Date(dueDateTime)
                    endDate.setHours(baseHour, 0, 0, 0)
                    const finalEndMin = Math.max(start + 15, end)
                    endDate.setMinutes(endDate.getMinutes() + finalEndMin)
                    setInitialDueDate(endDate.toISOString())
                    setPresetMinutes(finalEndMin - start)
                    setEditingTask(null)
                    setEditingTaskId(null)
                    setOpenDialog(true)
                    setIsSelecting(false)
                  }}
                  onMouseLeave={() => {
                    if (isSelecting) setIsSelecting(false)
                  }}
                >
                  {hoursSeq.map((_, idx) => (
                    <div key={idx} className={cal.hourRow} style={{ height: PX_PER_HOUR }} />
                  ))}
                  {isSameDate(currentDate, new Date()) && (
                    <div className={cal.nowLine} style={{ top: `${getNowOffsetPx(wake, spanMinutes)}px` }} />
                  )}
                  {isSelecting && selectStartMin !== null && selectEndMin !== null && (
                    (() => {
                      const top = Math.min(selectStartMin, selectEndMin) * PX_PER_MIN
                      const height = Math.max(16, Math.abs(selectEndMin - selectStartMin) * PX_PER_MIN)
                      return <div className={cal.selectionBox} style={{ top, height }} />
                    })()
                  )}
                  {(demoMode ? demoEvents : events)
                    .filter(evt => isSameDate(new Date(evt.start_time), currentDate))
                    .map((evt) => {
                      const { top, height } = getEventBox(evt.start_time, evt.end_time, wake, spanMinutes)
                      return (
                        <div
                          key={evt.id}
                          className={cal.eventDay}
                          style={{ top, height }}
                          onClick={() => handleEventClick(evt)}
                        >
                          {evt.title}
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Floating model response overlay (does not affect layout) */}
        {notification && (
          <div className={cal.overlayWrap}>
            <div className={cal.overlayBubble}>{notification}</div>
          </div>
        )}
      </div>

      <TaskDialog
        open={openDialog}
        onClose={() => { setOpenDialog(false); setEditingTaskId(null); setEditingTask(null) }}
        isEditMode={!!editingTaskId}
        initialTopic={editingTask?.topic}
        initialEstimatedMinutes={editingTask?.estimated_minutes ?? presetMinutes}
        initialDifficulty={editingTask?.difficulty}
        initialDueDate={initialDueDate}
        initialDescription={editingTask?.description}
        onSave={async (data) => {
          if (demoMode) {
            if (editingTaskId) {
              const scheduledEnd = new Date(data.due_date)
              const scheduledStart = new Date(scheduledEnd.getTime() - data.estimated_minutes * 60000)
              await demoUpdateTask(editingTaskId, {
                topic: data.topic,
                estimated_minutes: data.estimated_minutes,
                difficulty: data.difficulty,
                due_date: data.due_date,
                description: data.description,
                scheduled_start: scheduledStart.toISOString(),
                scheduled_end: scheduledEnd.toISOString(),
                status: 'scheduled',
              })
            } else {
              const scheduledEnd = new Date(data.due_date)
              const scheduledStart = new Date(scheduledEnd.getTime() - data.estimated_minutes * 60000)
              await demoCreateTask({
                user_id: userId,
                topic: data.topic,
                estimated_minutes: data.estimated_minutes,
                difficulty: data.difficulty,
                due_date: data.due_date,
                description: data.description,
                scheduled_start: scheduledStart.toISOString(),
                scheduled_end: scheduledEnd.toISOString(),
                status: 'scheduled',
              })
            }
            await refreshViewData()
          } else {
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
          }
          setOpenDialog(false)
          setEditingTaskId(null)
          setEditingTask(null)
        }}
        onDelete={editingTaskId ? async () => {
          if (demoMode) {
            await demoDeleteTask(editingTaskId)
          } else {
            await removeTask(String(editingTaskId))
          }
          await refreshViewData()
          setOpenDialog(false)
          setEditingTaskId(null)
          setEditingTask(null)
        } : undefined}
      />
    </section>

    {/* Bottom chat bar in second row (15%) */}
    <div className={cal.chatBar}>
      <form
        className={cal.inputForm}
        onSubmit={async (e) => {
          e.preventDefault()
          if (!input.trim()) return
          if (demoMode && sentCount >= (demoMaxMessages || 1)) {
            setNotification(
              <span>
                Demo limit reached. <a href={pricingAnchor} className="font-bold underline">Start scheduling now</a>
              </span>
            )
            return
          }
          const msg = input
          setInput("")
          try {
            if (demoMode) {
              const resp = await demoSendMessage(userId, msg)
              setSentCount(c => c + 1)
              setNotification(
                <span>
                  {resp} {" "}
                  <a href={pricingAnchor} className="font-bold underline">Start scheduling now</a>
                </span>
              )
            } else {
              const resp = await sendMessage(msg, userId)
              setNotification(resp)
              // refresh tasks + calendar events after assistant responds
              await refreshViewData()
              setTimeout(() => setNotification(null), 4000)
            }
          } catch {
            setNotification("Failed to send. Please try again.")
            setTimeout(() => setNotification(null), 2500)
          }
        }}
      >
        {/* Hidden file input for uploads */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/*,text/plain"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (!f) return
            try {
              setUploading(true)
              if (demoMode) {
                setNotification("File uploads are disabled in demo.")
                setTimeout(() => setNotification(null), 2500)
              } else {
                const res = await uploadChatFile(userId, f)
                setNotification(res.message || "File processed successfully.")
                setInput("Create tasks from my uploaded file")
                setTimeout(() => setNotification(null), 4000)
              }
            } catch (err) {
              setNotification("Upload failed. Please try again.")
              setTimeout(() => setNotification(null), 2500)
            } finally {
              setUploading(false)
              if (fileInputRef.current) fileInputRef.current.value = ""
            }
          }}
        />

        {/* Attach (paperclip) button */}
        <button
          type="button"
          aria-label="Upload file for agent"
          className={cal.attachBtn}
          disabled={uploading || (demoMode && sentCount >= (demoMaxMessages || 1))}
          onClick={() => fileInputRef.current?.click()}
          title={uploading ? "Uploading..." : "Attach file"}
        >
          <Paperclip className="h-4 w-4" />
        </button>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={demoMode && sentCount >= (demoMaxMessages || 1)
            ? "Demo allows one message."
            : "Ask to schedule, reschedule, or summarize your week…"}
          className={cal.input}
          disabled={demoMode && sentCount >= (demoMaxMessages || 1)}
        />
        <button type="submit" className={cal.sendBtn} disabled={!input.trim() || isLoading || (demoMode && sentCount >= (demoMaxMessages || 1))}>
          Send
        </button>
      </form>
    </div>
    </div>
  )
}

// date helpers and positioning
function startOfWeek(date: Date) {
  // Monday as start of week
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 (Sun) -> 6 (Sat)
  const diffFromMonday = (day + 6) % 7 // 0 when Mon
  d.setDate(d.getDate() - diffFromMonday)
  return d
}
function endOfWeek(date: Date) { const d = startOfWeek(date); d.setDate(d.getDate() + 6); d.setHours(23,59,59,999); return d }
function addDays(date: Date, days: number) { const d = new Date(date); d.setDate(d.getDate() + days); return d }
function getWeekDates(date: Date) { const start = startOfWeek(date); return Array.from({ length: 7 }).map((_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)) }
function isSameDate(a: Date, b: Date) { return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate() }
function formatWeekTitle(date: Date) { const days = getWeekDates(date); const first = days[0]; const last = days[6]; return `${first.toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${last.toLocaleDateString('en-US',{month:'short',day:'numeric'})}` }
function formatDayTitle(date: Date) { return date.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}) }
function formatHour(h: number) { const d = new Date(); d.setHours(h%24,0,0,0); return d.toLocaleTimeString('en-US',{hour:'numeric'}) }
function minutesSinceStartOfDay(iso: string) { const d = new Date(iso); return d.getHours()*60 + d.getMinutes() }
function getEventBox(startIso: string, endIso: string, baseHour: number, spanMinutes: number) {
  const startMin = minutesSinceStartOfDay(startIso) - baseHour*60
  const endMin = minutesSinceStartOfDay(endIso) - baseHour*60
  const clampedTopMin = Math.max(0, Math.min(startMin, spanMinutes))
  const clampedEndMin = Math.max(0, Math.min(endMin, spanMinutes))
  const top = clampedTopMin * PX_PER_MIN
  const height = Math.max(20, (clampedEndMin - clampedTopMin) * PX_PER_MIN)
  return { top, height }
}
function getNowOffsetPx(baseHour: number, spanMinutes: number) {
  const now = new Date()
  // Position the current time indicator with no artificial offset
  const min = now.getHours()*60 + now.getMinutes() - baseHour*60
  return Math.max(0, Math.min(min, spanMinutes) * PX_PER_MIN)
}
function yToMinutes(clientY: number, el: HTMLDivElement | null, clampTo: number) { if (!el) return 0; const rect = el.getBoundingClientRect(); const y = clientY - rect.top; const min = y/PX_PER_MIN; return Math.max(0, Math.min(min, clampTo)) }
function snap15(min: number) { return Math.round(min/15) * 15 }
function xToDayIndex(clientX: number, grid: HTMLDivElement | null) { if (!grid) return 0; const rect = grid.getBoundingClientRect(); const colW = rect.width/7; const idx = Math.floor((clientX-rect.left)/colW); return Math.max(0, Math.min(6, idx)) }
function buildHoursSequence(wake: number, sleep: number) { if (wake===sleep) return Array.from({length:24},(_,i)=> (wake+i)%24); if (wake<sleep) return Array.from({length:sleep-wake+1},(_,i)=> wake+i); const toMidnight=Array.from({length:24-wake},(_,i)=>wake+i); const fromMidnight=Array.from({length:sleep+1},(_,i)=>i); return [...toMidnight,...fromMidnight] }
