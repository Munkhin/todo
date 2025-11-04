export const scheduleStyles = {
  page: "relative flex h-full min-h-0 flex-col overflow-hidden",
  /* Calendar header and toolbar */
  calHeader: "flex flex-shrink-0 items-center justify-between border-b border-gray-200 p-[clamp(0.75rem,1.8vh,1.25rem)]",
  calHeaderLeft: "flex items-center gap-2",
  calHeaderRight: "flex items-center gap-2",
  calTitle: "text-lg font-semibold",
  navBtn: "rounded-md p-1 hover:bg-gray-100",
  todayBtn: "rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50",
  refreshBtn: "inline-flex items-center rounded-md px-2 py-1 text-sm hover:bg-gray-100",
  viewToggle: "inline-flex rounded-md border border-gray-300",
  viewBtn: "px-3 py-1 text-sm hover:bg-gray-50 first:rounded-l-md last:rounded-r-md aria-selected:bg-gray-900 aria-selected:text-white",
  /* Calendar grid area */
  calendarArea: "relative z-0 flex-1 overflow-auto p-[clamp(0.75rem,1.8vh,1.25rem)]",
  weekOuterGrid: "grid w-full grid-cols-[64px_1fr] gap-2",
  // Sticky week header overlay that spans the full top band above lanes
  weekHeader: "sticky top-0 z-10 grid grid-cols-7 place-items-center h-12 gap-2 mb-2 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80",
  // Prevent wrapping of weekday labels
  weekHeaderCell: "text-center text-sm font-medium text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis",
  weekGrid: "grid w-full grid-cols-7 gap-2",
  dayCell: "relative min-h-96 rounded-md border border-gray-200 bg-gray-50",
  weekHours: "relative h-[1088px]",
  weekHourRow: "h-16 border-b border-gray-100",
  dayCellToday: "bg-blue-50 border-blue-300",
  event: "absolute left-1 right-1 top-6 rounded-md border-l-4 border-blue-400 bg-blue-100 p-2 text-xs font-semibold text-gray-800 shadow-sm",
  /* Chat input bar at bottom of view, layered above calendar */
  chatBar: "relative z-20 flex-shrink-0 border-t bg-white p-[clamp(0.75rem,1.8vh,1.25rem)]",
  inputForm: "flex items-center gap-2",
  input: "flex-1 rounded-md border border-gray-300 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-gray-300",
  attachBtn: "inline-flex h-[42px] w-[42px] items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-60",
  sendBtn: "inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60",
  /* Floating model response container: make sticky at bottom of scroll area */
  overlayWrap: "pointer-events-none sticky bottom-6 z-30 flex justify-center px-4",
  overlayBubble: "pointer-events-auto max-w-[52rem] rounded-md border border-gray-800 bg-gray-900 px-4 py-3 text-sm text-white shadow-lg",
  /* Day view */
  dayArea: "h-full w-full overflow-auto p-[clamp(0.75rem,1.8vh,1.25rem)]",
  dayGrid: "grid w-full grid-cols-[64px_1fr] gap-2",
  timeCol: "text-right pr-2 text-xs text-gray-500",
  timeLabel: "h-16 flex items-end pb-[2px] leading-none",
  dayCol: "relative",
  dayHours: "relative",
  hourRow: "h-16 border-b border-gray-100",
  eventDay: "absolute left-2 right-2 rounded-md border-l-4 border-blue-400 bg-blue-100 p-2 text-xs font-semibold text-gray-800 shadow-sm",
  eventDayHandle: "absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize rounded-b-md bg-blue-400/40",
  eventDayDragging: "opacity-80 ring-2 ring-blue-400",
  selectionBox: "absolute left-2 right-2 rounded-md border border-blue-400 bg-blue-500/20",
  nowLine: "absolute left-0 right-0 h-[2px] bg-red-500",
}
