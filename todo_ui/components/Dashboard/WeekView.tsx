import { useRef } from "react"
import { scheduleStyles as cal } from "./ScheduleView.styles"
import { getWeekDates, isSameDate, formatHour, getEventBox, getNowOffsetPercent } from "@/lib/utils/calendar"
import type { CalendarEvent } from "@/lib/api/calendar"

type WeekViewProps = {
  currentDate: Date
  hoursSeq: number[]
  spanMinutes: number
  wake: number
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onTimeSelect: (startMin: number, endMin: number, dayIndex: number, dayDate: Date) => void
  selectionBox: { top: string; height: string } | null
  selectionDayIndex?: number
  onMouseDown: (e: React.MouseEvent, ref: HTMLDivElement | null, spanMinutes: number, dayIndex: number) => void
  onMouseMove: (e: React.MouseEvent, ref: HTMLDivElement | null, spanMinutes: number, dayIndex: number) => void
  onMouseUp: (callback: (startMin: number, endMin: number, dayIndex?: number) => void) => void
}

export default function WeekView({
  currentDate,
  hoursSeq,
  spanMinutes,
  wake,
  events,
  onEventClick,
  onTimeSelect,
  selectionBox,
  selectionDayIndex,
  onMouseDown,
  onMouseMove,
  onMouseUp,
}: WeekViewProps) {
  const weekHoursRefs = useRef<(HTMLDivElement | null)[]>([])
  const weekDates = getWeekDates(currentDate)

  return (
    <div className={cal.weekOuterGrid}>
      {/* Left time column: add spacer equal to sticky header height to align rows */}
      <div className={cal.timeCol}>
        <div className={cal.weekHeaderSpacer} aria-hidden="true" />
        {hoursSeq.map((h, idx) => (
          <div key={idx} className={cal.timeLabel} style={{ height: `${100 / hoursSeq.length}%` }}>
            {formatHour(h)}
          </div>
        ))}
      </div>

      {/* Right: headers + 7 day columns */}
      <div className="min-h-0 flex flex-col">
        <div className={cal.weekHeader}>
          {weekDates.map((dayDate, i) => (
            <div key={i} className={cal.weekHeaderCell}>
              {dayDate.toLocaleDateString('en-US', { weekday: 'short' })} {dayDate.getDate()}
            </div>
          ))}
        </div>

        <div className={cal.weekGrid}>
          {weekDates.map((dayDate, i) => (
            <div
              key={i}
              className={`${cal.dayCell} ${isSameDate(dayDate, new Date()) ? cal.dayCellToday : ''}`}
            >
              <div
                ref={(el) => { weekHoursRefs.current[i] = el }}
                className={cal.weekHours}
                style={{ height: '100%' }}
                onMouseDown={(e) => onMouseDown(e, weekHoursRefs.current[i], spanMinutes, i)}
                onMouseMove={(e) => onMouseMove(e, weekHoursRefs.current[i], spanMinutes, i)}
                onMouseUp={() => onMouseUp((start, end, dayIdx) => {
                  if (dayIdx !== undefined) {
                    onTimeSelect(start, end, dayIdx, weekDates[dayIdx])
                  }
                })}
              >
                {/* Hour grid lines */}
                {hoursSeq.map((_, idx) => (
                  <div key={idx} className={cal.weekHourRow} style={{ height: `${100 / hoursSeq.length}%` }} />
                ))}

                {/* Now line indicator */}
                {isSameDate(dayDate, new Date()) && (
                  <div className={cal.nowLine} style={{ top: getNowOffsetPercent(wake, spanMinutes) }} />
                )}

                {/* Calendar events */}
                {events
                  .filter(evt => isSameDate(new Date(evt.start_time), dayDate))
                  .map((evt) => {
                    const { top, height, minHeight } = getEventBox(evt.start_time, evt.end_time, wake, spanMinutes)
                    return (
                      <div
                        key={evt.id}
                        className={cal.eventDay}
                        style={{ top, height, minHeight }}
                        onClick={() => onEventClick(evt)}
                      >
                        {evt.title}
                      </div>
                    )
                  })}

                {/* Time selection box */}
                {selectionBox && selectionDayIndex === i && (
                  <div className={cal.selectionBox} style={{ top: selectionBox.top, height: selectionBox.height }} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
