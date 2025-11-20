"use client"
import React, { useState, useMemo, useRef, useCallback } from "react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Dot } from "recharts"
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

type EnergyGraphProps = {
  wakeHour: number
  sleepHour: number
  energyLevels: Record<number, number>
  onChange: (energyLevels: Record<number, number>) => void
}

const chartConfig = {
  energy: {
    label: "Energy",
    color: "#2563eb",
  },
} satisfies ChartConfig

export default function EnergyGraph({ wakeHour, sleepHour, energyLevels, onChange }: EnergyGraphProps) {
  const [draggingHour, setDraggingHour] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Generate hours sequence from wake to sleep
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

  const formatHour = (h: number): string => {
    if (h === 0) return '12am'
    if (h < 12) return `${h}am`
    if (h === 12) return '12pm'
    return `${h - 12}pm`
  }

  // Prepare chart data
  const chartData = useMemo(() => {
    return hours.map(hour => ({
      hour: hour,
      hourLabel: formatHour(hour),
      energy: energyLevels[hour] ?? 5,
    }))
  }, [hours, energyLevels])

  const handleDotMouseDown = (data: any) => {
    setDraggingHour(data.hour)
  }

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingHour === null || !containerRef.current) return

    const chartElement = containerRef.current.querySelector('[data-chart]')
    if (!chartElement) return

    const rect = chartElement.getBoundingClientRect()
    const yPos = e.clientY - rect.top

    // Chart coordinates (accounting for margins)
    const margin = 20
    const chartHeight = rect.height - (2 * margin)

    // Calculate relative position (0 = bottom, 1 = top)
    const relativeY = Math.max(0, Math.min(1, 1 - ((yPos - margin) / chartHeight)))

    // Convert to energy level (0-10)
    const newEnergy = Math.round(relativeY * 10)

    if (energyLevels[draggingHour] !== newEnergy) {
      onChange({ ...energyLevels, [draggingHour]: newEnergy })
    }
  }, [draggingHour, energyLevels, onChange])

  const handleMouseUp = () => {
    setDraggingHour(null)
  }

  // Custom draggable dot
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props
    const isActive = draggingHour === payload.hour

    return (
      <g>
        <Dot
          cx={cx}
          cy={cy}
          r={isActive ? 6 : 4}
          fill="#2563eb"
          stroke="#fff"
          strokeWidth={2}
          className="cursor-grab active:cursor-grabbing"
          onMouseDown={() => handleDotMouseDown(payload)}
          style={{
            filter: isActive ? 'drop-shadow(0 0 6px rgba(37, 99, 235, 0.5))' : 'none',
            transition: 'all 0.15s ease',
            pointerEvents: 'all'
          }}
        />
      </g>
    )
  }

  return (
    <div
      ref={containerRef}
      className="w-full space-y-4 select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <ChartContainer config={chartConfig} className="h-[300px] w-full">
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100" vertical={false} />
          <XAxis
            dataKey="hourLabel"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            className="text-xs"
          />
          <YAxis
            domain={[0, 10]}
            ticks={[0, 5, 10]}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            className="text-xs"
            tickFormatter={(value) => {
              if (value === 0) return 'Low'
              if (value === 5) return 'Med'
              if (value === 10) return 'High'
              return value
            }}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(value) => `${value}`}
                formatter={(value) => [`Energy: ${value}`, ""]}
              />
            }
          />
          <defs>
            <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Line
            type="monotone"
            dataKey="energy"
            stroke="#2563eb"
            strokeWidth={3}
            dot={<CustomDot />}
            fill="url(#energyGradient)"
          />
        </LineChart>
      </ChartContainer>
      <p className="text-center text-sm text-gray-400">
        Click and drag the points to adjust your energy levels throughout the day
      </p>
    </div>
  )
}
