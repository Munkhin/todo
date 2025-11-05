import { ChevronLeft, ChevronRight } from "lucide-react"
import { scheduleStyles as cal } from "./ScheduleView.styles"

type CalendarHeaderProps = {
  currentDate: Date
  view: 'week' | 'day'
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onViewChange: (view: 'week' | 'day') => void
  formatTitle: (date: Date) => string
}

export default function CalendarHeader({
  currentDate,
  view,
  onPrev,
  onNext,
  onToday,
  onViewChange,
  formatTitle,
}: CalendarHeaderProps) {
  return (
    <div className={cal.calHeader}>
      <div className={cal.calHeaderLeft}>
        <button className={cal.navBtn} onClick={onPrev}>
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className={cal.calTitle}>
          {formatTitle(currentDate)}
        </div>
        <button className={cal.navBtn} onClick={onNext}>
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className={cal.calHeaderRight}>
        <div className={cal.viewToggle} role="tablist" aria-label="View toggle">
          <button
            role="tab"
            aria-selected={view === 'week'}
            className={cal.viewBtn}
            onClick={() => onViewChange('week')}
          >
            Week
          </button>
          <button
            role="tab"
            aria-selected={view === 'day'}
            className={cal.viewBtn}
            onClick={() => onViewChange('day')}
          >
            Day
          </button>
        </div>
        <button className={cal.todayBtn} onClick={onToday}>
          Today
        </button>
      </div>
    </div>
  )
}
