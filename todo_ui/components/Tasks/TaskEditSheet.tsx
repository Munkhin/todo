"use client"

import { FormEvent, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { type Task, type TaskUpdateData, updateTask } from "@/lib/api/tasks"

type EditFormState = {
  title: string
  description: string
  priority: string
  status: string
  due_date: string
}

const initialFormState: EditFormState = {
  title: "",
  description: "",
  priority: "medium",
  status: "pending",
  due_date: "",
}

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
]

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
]

const formatIsoForInput = (value?: string) => {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const offset = date.getTimezoneOffset()
  const adjusted = new Date(date.getTime() - offset * 60000)
  return adjusted.toISOString().slice(0, 16)
}

type TaskEditSheetProps = {
  task: Task
  open: boolean
  onClose: () => void
  onSaved?: () => void | Promise<void>
}

export default function TaskEditSheet({ task, open, onClose, onSaved }: TaskEditSheetProps) {
  const [formState, setFormState] = useState<EditFormState>(initialFormState)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setError(null)
    }
  }, [open])

  useEffect(() => {
    setFormState({
      title: task.title,
      description: task.description ?? "",
      priority: task.priority ?? "medium",
      status: task.status ?? "pending",
      due_date: formatIsoForInput(task.due_date),
    })
  }, [task])

  const handleFieldChange = (field: keyof EditFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    const payload: TaskUpdateData = {
      title: formState.title,
      description: formState.description || undefined,
      priority: formState.priority,
      status: formState.status,
    }

    if (formState.due_date) {
      payload.due_date = new Date(formState.due_date).toISOString()
    }

    try {
      await updateTask(String(task.id), payload)
      await onSaved?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update task")
    } finally {
      setSaving(false)
    }
  }

  const handleSheetChange = (value: boolean) => {
    if (!value) {
      onClose()
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleSheetChange}>
      <SheetContent side="right" className="max-w-xl">
        <SheetHeader>
          <SheetTitle>Edit Task</SheetTitle>
          <SheetDescription>Updates apply to the task record only.</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4">
          <div className="space-y-2">
            <label htmlFor="task-title" className="text-sm font-semibold text-gray-700">
              Title
            </label>
            <Input
              id="task-title"
              value={formState.title}
              onChange={(event) => handleFieldChange("title", event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="task-description" className="text-sm font-semibold text-gray-700">
              Description
            </label>
            <textarea
              id="task-description"
              rows={3}
              className="min-h-[4rem] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              value={formState.description}
              onChange={(event) => handleFieldChange("description", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="task-due-date" className="text-sm font-semibold text-gray-700">
              Due date
            </label>
            <Input
              id="task-due-date"
              type="datetime-local"
              value={formState.due_date}
              onChange={(event) => handleFieldChange("due_date", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">Status</p>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((status) => {
                const active = formState.status === status.value
                return (
                  <button
                    key={status.value}
                    type="button"
                    aria-pressed={active}
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm font-medium transition",
                      active
                        ? "border-transparent bg-primary text-primary-foreground"
                        : "border-border bg-transparent text-muted-foreground hover:border-primary hover:text-primary"
                    )}
                    onClick={() => handleFieldChange("status", status.value)}
                  >
                    {status.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="task-priority" className="text-sm font-semibold text-gray-700">
              Priority
            </label>
            <div>
              <select
                id="task-priority"
                value={formState.priority}
                onChange={(event) => handleFieldChange("priority", event.target.value)}
                className="w-full rounded-md border border-input bg-transparent px-3 py-1 text-base text-foreground shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              >
                {priorityOptions.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <SheetFooter className="pt-2">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <Button className="w-full" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
              <Button variant="outline" className="w-full" type="button" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
