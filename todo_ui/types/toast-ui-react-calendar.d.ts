// type declarations for @toast-ui/react-calendar
declare module '@toast-ui/react-calendar' {
  import { Component } from 'react'
  import type { EventObject, Options, ExternalEventTypes } from '@toast-ui/calendar'

  type CalendarView = 'day' | 'week' | 'month'

  type ReactCalendarOptions = Omit<Options, 'defaultView'>

  type CalendarExternalEventNames = Extract<keyof ExternalEventTypes, string>
  type ReactCalendarEventNames = `on${Capitalize<CalendarExternalEventNames>}`
  type ReactCalendarEventHandler = ExternalEventTypes[CalendarExternalEventNames]
  type ReactCalendarExternalEvents = {
    [events in ReactCalendarEventNames]?: ReactCalendarEventHandler
  }

  interface CalendarProps extends ReactCalendarOptions, ReactCalendarExternalEvents {
    height?: string
    events?: Partial<EventObject>[]
    view?: CalendarView
  }

  export default class Calendar extends Component<CalendarProps> {
    getInstance(): any
    getRootElement(): HTMLDivElement | null
  }
}
