"use client"

import { useEffect, useMemo, useState, useId } from "react"
import { settingsStyles } from "./SettingsView.styles"
import {
  buildDurationHelperText,
  DurationUnit,
  formatDurationInput,
  parseDurationInput,
} from "@/lib/utils/duration"

type DurationInputProps = {
  label: string
  value: number | null | undefined
  onChange: (minutes: number) => void
  plainNumberUnit?: DurationUnit
  minMinutes?: number
  maxMinutes?: number
}

export default function DurationInput({
  label,
  value,
  onChange,
  plainNumberUnit = "minutes",
  minMinutes,
  maxMinutes,
}: DurationInputProps) {
  const [inputValue, setInputValue] = useState("")
  const [error, setError] = useState<string | null>(null)
  const inputId = useId()
  const errorId = `${inputId}-error`

  useEffect(() => {
    const formatted = formatDurationInput(value, plainNumberUnit)
    if (formatted !== inputValue) {
      setInputValue(formatted)
    }
  }, [value, plainNumberUnit])

  const helperText = useMemo(
    () => buildDurationHelperText(plainNumberUnit),
    [plainNumberUnit]
  )

  const commitValue = () => {
    if (!inputValue.trim()) {
      setError("Value required")
      return
    }

    const minutes = parseDurationInput(inputValue, plainNumberUnit)
    if (minutes === null) {
      setError("Use minutes or H:MM format")
      return
    }

    if (typeof minMinutes === "number" && minutes < minMinutes) {
      setError(`Must be at least ${minMinutes} min`)
      return
    }

    if (typeof maxMinutes === "number" && minutes > maxMinutes) {
      setError(`Must be <= ${maxMinutes} min`)
      return
    }

    setError(null)
    onChange(minutes)
  }

  return (
    <label className={settingsStyles.label}>
      {label}
      <input
        type="text"
        className={`${settingsStyles.input} font-mono`}
        value={inputValue}
        placeholder={plainNumberUnit === "hours" ? "e.g. 2 or 1:30" : "e.g. 45 or 1:15"}
        onChange={(e) => {
          setInputValue(e.target.value)
          if (error) setError(null)
        }}
        onBlur={commitValue}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            commitValue()
          }
        }}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? errorId : undefined}
        id={inputId}
      />
      <span className="mt-1 block text-xs text-gray-500">{helperText}</span>
      {error && (
        <span id={errorId} className="mt-1 block text-xs text-red-600">
          {error}
        </span>
      )}
    </label>
  )
}
