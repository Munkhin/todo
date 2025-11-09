"use client"
import { useState, useRef, useEffect } from "react"

type EnergyGraphProps = {
  wakeHour: number
  sleepHour: number
  energyLevels: Record<number, number>
  onChange: (energyLevels: Record<number, number>) => void
}

export default function EnergyGraph({ wakeHour, sleepHour, energyLevels, onChange }: EnergyGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  // generate hours sequence from wake to sleep
  const getHoursSequence = (): number[] => {
    const hours: number[] = []
    if (wakeHour < sleepHour) {
      for (let h = wakeHour; h <= sleepHour; h++) hours.push(h)
    } else if (wakeHour > sleepHour) {
      for (let h = wakeHour; h < 24; h++) hours.push(h)
      for (let h = 0; h <= sleepHour; h++) hours.push(h)
    } else {
      for (let h = 0; h < 24; h++) hours.push(h)
    }
    return hours
  }

  const hours = getHoursSequence()

  // draw graph
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const padding = 40

    // clear
    ctx.clearRect(0, 0, width, height)

    // draw grid
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1

    // horizontal grid lines (energy levels 0-10)
    for (let i = 0; i <= 10; i++) {
      const y = padding + (height - 2 * padding) * (1 - i / 10)
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()

      // labels
      ctx.fillStyle = '#6b7280'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(String(i), padding - 10, y + 4)
    }

    // vertical grid lines (24 hours)
    ctx.strokeStyle = '#f3f4f6'
    for (let h = 0; h < 24; h++) {
      const x = padding + (width - 2 * padding) * (h / 23)
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, height - padding)
      ctx.stroke()

      // hour labels with AM/PM format
      ctx.fillStyle = '#6b7280'
      ctx.font = '11px sans-serif'
      ctx.textAlign = 'center'
      const label = h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`
      ctx.fillText(label, x, height - padding + 20)
    }

    // highlight wake/sleep region
    const wakeX = padding + (width - 2 * padding) * (wakeHour / 23)
    const sleepX = padding + (width - 2 * padding) * (sleepHour / 23)
    ctx.fillStyle = 'rgba(59, 130, 246, 0.05)'
    if (wakeHour < sleepHour) {
      ctx.fillRect(wakeX, padding, sleepX - wakeX, height - 2 * padding)
    } else {
      ctx.fillRect(wakeX, padding, width - padding - wakeX, height - 2 * padding)
      ctx.fillRect(padding, padding, sleepX - padding, height - 2 * padding)
    }

    // draw energy line
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 3
    ctx.beginPath()

    hours.forEach((h, i) => {
      const energy = energyLevels[h] ?? 5
      const x = padding + (width - 2 * padding) * (h / 23)
      const y = padding + (height - 2 * padding) * (1 - energy / 10)

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.stroke()

    // draw points
    hours.forEach((h) => {
      const energy = energyLevels[h] ?? 5
      const x = padding + (width - 2 * padding) * (h / 23)
      const y = padding + (height - 2 * padding) * (1 - energy / 10)

      ctx.fillStyle = '#3b82f6'
      ctx.beginPath()
      ctx.arc(x, y, 5, 0, 2 * Math.PI)
      ctx.fill()
    })

  }, [wakeHour, sleepHour, energyLevels, hours])

  const handleCanvasInteraction = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const width = canvas.width
    const height = canvas.height
    const padding = 40

    // find closest hour
    const hourFrac = Math.max(0, Math.min(1, (x - padding) / (width - 2 * padding)))
    const hour = Math.round(hourFrac * 23)

    // calculate energy level
    const energyFrac = Math.max(0, Math.min(1, 1 - (y - padding) / (height - 2 * padding)))
    const energy = Math.round(energyFrac * 10)

    // update
    onChange({ ...energyLevels, [hour]: energy })
  }

  return (
    <div className="w-full">
      <div className="mb-2 text-sm text-gray-600">
        Click and drag on the graph to adjust energy levels throughout the day (0-10 scale)
      </div>
      <canvas
        ref={canvasRef}
        width={800}
        height={300}
        className="border border-gray-200 rounded cursor-crosshair w-full"
        style={{ maxWidth: '100%', height: 'auto' }}
        onMouseDown={(e) => {
          setIsDragging(true)
          handleCanvasInteraction(e)
        }}
        onMouseMove={(e) => {
          if (isDragging) {
            handleCanvasInteraction(e)
          }
        }}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
      />
    </div>
  )
}
