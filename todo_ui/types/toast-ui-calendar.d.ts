// type declarations for @toast-ui/calendar
declare module '@toast-ui/calendar' {
  export interface EventObject {
    id?: string | number
    calendarId?: string
    title?: string
    body?: string
    isAllday?: boolean
    start?: string | Date
    end?: string | Date
    goingDuration?: number
    comingDuration?: number
    location?: string
    attendees?: string[]
    category?: string
    dueDateClass?: string
    recurrenceRule?: string
    state?: string
    isVisible?: boolean
    isPending?: boolean
    isFocused?: boolean
    isReadOnly?: boolean
    isPrivate?: boolean
    color?: string
    backgroundColor?: string
    dragBackgroundColor?: string
    borderColor?: string
    customStyle?: string | Record<string, any>
    raw?: any
  }

  export interface Options {
    defaultView?: 'day' | 'week' | 'month'
    taskView?: boolean | string[]
    scheduleView?: boolean | string[]
    useFormPopup?: boolean
    useDetailPopup?: boolean
    isReadOnly?: boolean
    week?: {
      startDayOfWeek?: number
      dayNames?: string[]
      narrowWeekend?: boolean
      workweek?: boolean
      showTimezoneCollapseButton?: boolean
      timezonesCollapsed?: boolean
      hourStart?: number
      hourEnd?: number
      eventView?: boolean | string[]
      taskView?: boolean | string[]
      collapseDuplicateEvents?: {
        getDuplicateEvents?: (targetEvent: EventObject, events: EventObject[]) => EventObject[]
        getMainEvent?: (duplicateEvents: EventObject[]) => EventObject
      }
    }
    month?: {
      dayNames?: string[]
      startDayOfWeek?: number
      narrowWeekend?: boolean
      visibleWeeksCount?: number
      isAlways6Weeks?: boolean
      workweek?: boolean
      visibleEventCount?: number
    }
    calendars?: Array<{
      id: string
      name: string
      backgroundColor?: string
      borderColor?: string
      color?: string
      dragBackgroundColor?: string
    }>
    gridSelection?: boolean | {
      enableDblClick?: boolean
      enableClick?: boolean
    }
    timezone?: {
      zones?: Array<{
        timezoneName: string
        displayLabel?: string
        tooltip?: string
      }>
    }
    theme?: Record<string, any>
    template?: Record<string, any>
    usageStatistics?: boolean
    eventFilter?: (event: EventObject) => boolean
  }

  export interface ExternalEventTypes {
    selectDateTime: (info: any) => void
    beforeCreateEvent: (eventData: any) => void
    beforeUpdateEvent: (event: any) => void
    beforeDeleteEvent: (event: any) => void
    afterRenderEvent: (event: any) => void
    clickDayName: (event: any) => void
    clickEvent: (event: any) => void
    clickMoreEventsBtn: (event: any) => void
    clickTimezonesCollapseBtn: (prevState: boolean) => void
  }

  export default class Calendar {
    constructor(container: HTMLElement, options?: Options)

    createEvents(events: EventObject[]): void
    getEvent(eventId: string | number, calendarId: string): EventObject | null
    updateEvent(eventId: string | number, calendarId: string, changes: Partial<EventObject>): void
    deleteEvent(eventId: string | number, calendarId: string): void
    clear(): void

    render(): void
    destroy(): void

    setDate(date: Date | string): void
    today(): void
    prev(): void
    next(): void
    getDate(): Date
    getDateRangeStart(): Date
    getDateRangeEnd(): Date

    changeView(view: 'day' | 'week' | 'month'): void
    getViewName(): string

    setOptions(options: Partial<Options>): void
    setTheme(theme: Record<string, any>): void
    setCalendars(calendars: Options['calendars']): void

    on(eventName: string, handler: Function): void
    off(eventName: string): void
    fire(eventName: string, ...args: any[]): void

    scrollToNow(): void
  }
}
