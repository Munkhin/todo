import { useState, useCallback } from 'react'
import { yToMinutes, snap15 } from '@/lib/utils/calendar'

type SelectionState = {
  isSelecting: boolean
  selectStartMin: number | null
  selectEndMin: number | null
}

type TimeSelectionHandlers = {
  onMouseDown: (e: React.MouseEvent, ref: HTMLDivElement | null, spanMinutes: number, dayIndex?: number) => void
  onMouseMove: (e: React.MouseEvent, ref: HTMLDivElement | null, spanMinutes: number, dayIndex?: number) => void
  onMouseUp: (callback: (startMin: number, endMin: number, dayIndex?: number) => void) => void
  onMouseLeave: () => void
  resetSelection: () => void
  getSelectionBox: (spanMinutes: number) => { top: string; height: string } | null
}

export function useTimeSelection(): [SelectionState, TimeSelectionHandlers] {
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectStartMin, setSelectStartMin] = useState<number | null>(null)
  const [selectEndMin, setSelectEndMin] = useState<number | null>(null)
  const [selectionDayIndex, setSelectionDayIndex] = useState<number | undefined>()

  const resetSelection = useCallback(() => {
    setIsSelecting(false)
    setSelectStartMin(null)
    setSelectEndMin(null)
    setSelectionDayIndex(undefined)
  }, [])

  const onMouseDown = useCallback(
    (e: React.MouseEvent, ref: HTMLDivElement | null, spanMinutes: number, dayIndex?: number) => {
      const min = yToMinutes(e.clientY, ref, spanMinutes)
      const snapped = snap15(min)
      setIsSelecting(true)
      setSelectStartMin(snapped)
      setSelectEndMin(snapped + 60)
      setSelectionDayIndex(dayIndex)
    },
    []
  )

  const onMouseMove = useCallback(
    (e: React.MouseEvent, ref: HTMLDivElement | null, spanMinutes: number, dayIndex?: number) => {
      if (!isSelecting) return
      // Use the stored day index if in week view
      const targetRef = dayIndex !== undefined && dayIndex === selectionDayIndex ? ref : ref
      const min = yToMinutes(e.clientY, targetRef, spanMinutes)
      setSelectEndMin(snap15(min))
    },
    [isSelecting, selectionDayIndex]
  )

  const onMouseUp = useCallback(
    (callback: (startMin: number, endMin: number, dayIndex?: number) => void) => {
      if (!isSelecting || selectStartMin === null || selectEndMin === null) return
      const start = Math.min(selectStartMin, selectEndMin)
      const end = Math.max(selectStartMin, selectEndMin)
      callback(start, Math.max(start + 15, end), selectionDayIndex)
      resetSelection()
    },
    [isSelecting, selectStartMin, selectEndMin, selectionDayIndex, resetSelection]
  )

  const onMouseLeave = useCallback(() => {
    if (isSelecting) setIsSelecting(false)
  }, [isSelecting])

  const getSelectionBox = useCallback((spanMinutes: number) => {
    if (!isSelecting || selectStartMin === null || selectEndMin === null) return null
    const topMin = Math.min(selectStartMin, selectEndMin)
    const endMin = Math.max(selectStartMin, selectEndMin)
    const topPercent = (topMin / spanMinutes) * 100
    const heightPercent = ((endMin - topMin) / spanMinutes) * 100
    return {
      top: `${topPercent}%`,
      height: `${Math.max(1, heightPercent)}%` // Min 1% for visibility
    }
  }, [isSelecting, selectStartMin, selectEndMin])

  return [
    { isSelecting, selectStartMin, selectEndMin },
    { onMouseDown, onMouseMove, onMouseUp, onMouseLeave, resetSelection, getSelectionBox }
  ]
}
