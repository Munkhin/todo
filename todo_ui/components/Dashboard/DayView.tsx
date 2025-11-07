import { useRef } from "react"
import { scheduleStyles as cal } from "./ScheduleView.styles"
import { isSameDate, formatHour, getEventBox, getNowOffsetPercent } from "@/lib/utils/calendar"
import type { CalendarEvent } from "@/lib/api/calendar"

type DayViewProps = {
  currentDate: Date
  hoursSeq: number[]
  spanMinutes: number
  wake: number
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onTimeSelect: (startMin: number, endMin: number) => void
  selectionBox: { top: string; height: string } | null
  onMouseDown: (e: React.MouseEvent, ref: HTMLDivElement | null, spanMinutes: number) => void
  onMouseMove: (e: React.MouseEvent, ref: HTMLDivElement | null, spanMinutes: number) => void
  onMouseUp: (callback: (startMin: number, endMin: number) => void) => void
  onMouseLeave: () => void
}

export default function DayView({
  currentDate,
  hoursSeq,
  spanMinutes,
  wake,
  events,
  onEventClick,
  onTimeSelect,
  selectionBox,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
}: DayViewProps) {
  const dayHoursRef = useRef<HTMLDivElement>(null)

  return (
    <div className={cal.dayArea}>
      <div className={cal.dayGrid} style={{ height: '100%' }}>
        <div className={cal.timeCol}>
          {hoursSeq.slice(1).map((h, idx) => {
            // Skip first hour only, adjust index to account for skipped first hour
            const actualIdx = idx + 1
            return (
              <div
                key={actualIdx}
                className="absolute leading-none -translate-y-1/2"
                style={{ top: `${(actualIdx / hoursSeq.length) * 100}%` }}
              >
                {formatHour(h)}
              </div>
            )
          })}
        </div>

        <div className={cal.dayCol}>
          <div
            ref={dayHoursRef}
            className={cal.dayHours}
            style={{ height: '100%' }}
            onMouseDown={(e) => onMouseDown(e, dayHoursRef.current, spanMinutes)}
            onMouseMove={(e) => onMouseMove(e, dayHoursRef.current, spanMinutes)}
            onMouseUp={() => onMouseUp((start, end) => onTimeSelect(start, end))}
            onMouseLeave={onMouseLeave}
          >
            {/* Hour grid lines */}
            {hoursSeq.map((_, idx) => (
              <div key={idx} className={cal.hourRow} style={{ height: `${100 / hoursSeq.length}%` }} />
            ))}

            {/* Now line indicator */}
            {isSameDate(currentDate, new Date()) && (
              <div className={cal.nowLine} style={{ top: getNowOffsetPercent(wake, spanMinutes) }} />
            )}

            {/* Time selection box */}
            {selectionBox && (
              <div className={cal.selectionBox} style={{ top: selectionBox.top, height: selectionBox.height }} />
            )}

            {/* Calendar events */}
            {events
              .filter(evt => isSameDate(new Date(evt.start_time), currentDate))
              .map((evt) => {
                const { top, height, minHeight } = getEventBox(evt.start_time, evt.end_time, wake, spanMinutes)
                return (
                  <div
                    key={evt.id}
                    className={cal.eventDay}
                    style={{ top, height, minHeight }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEventClick(evt)
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    {evt.title}
                  </div>
                )
              })}
          </div>
        </div>
      </div>
    </div>
  )
}
