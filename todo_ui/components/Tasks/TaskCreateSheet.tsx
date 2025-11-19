"use client"

import { FormEvent, useState } from "react"
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
import { type TaskCreateData, createTask } from "@/lib/api/tasks"

type CreateFormState = {
    title: string
    description: string
    priority: string
    status: string
    due_date: string
    estimated_duration: string
    difficulty: string
}

const initialFormState: CreateFormState = {
    title: "",
    description: "",
    priority: "medium",
    status: "pending",
    due_date: "",
    estimated_duration: "",
    difficulty: ""
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

type TaskCreateSheetProps = {
    open: boolean
    onClose: () => void
    onCreated?: () => void | Promise<void>
    userId: number
}

export default function TaskCreateSheet({ open, onClose, onCreated, userId }: TaskCreateSheetProps) {
    const [formState, setFormState] = useState<CreateFormState>(initialFormState)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleFieldChange = (field: keyof CreateFormState, value: string) => {
        setFormState((prev) => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setSaving(true)
        setError(null)

        const payload: TaskCreateData = {
            user_id: userId,
            title: formState.title,
            description: formState.description || undefined,
            priority: formState.priority,
            status: formState.status,
        }

        if (formState.due_date) {
            payload.due_date = new Date(formState.due_date).toISOString()
        }

        if (formState.estimated_duration) {
            payload.estimated_duration = parseInt(formState.estimated_duration, 10)
        }

        if (formState.difficulty) {
            payload.difficulty = parseInt(formState.difficulty, 10)
        }

        try {
            await createTask(payload)
            await onCreated?.()
            // Reset form
            setFormState(initialFormState)
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to create task")
        } finally {
            setSaving(false)
        }
    }

    const handleSheetChange = (value: boolean) => {
        if (!value) {
            onClose()
            // Reset form when closing
            setFormState(initialFormState)
            setError(null)
        }
    }

    return (
        <Sheet open={open} onOpenChange={handleSheetChange}>
            <SheetContent side="right" className="max-w-xl">
                <SheetHeader>
                    <SheetTitle>Create New Task</SheetTitle>
                    <SheetDescription>Add a new task to your list.</SheetDescription>
                </SheetHeader>
                <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4">
                    <div className="space-y-2">
                        <label htmlFor="task-title" className="text-sm font-semibold text-gray-700">
                            Title *
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
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="task-duration" className="text-sm font-semibold text-gray-700">
                                Duration (minutes)
                            </label>
                            <Input
                                id="task-duration"
                                type="number"
                                min="1"
                                value={formState.estimated_duration}
                                onChange={(event) => handleFieldChange("estimated_duration", event.target.value)}
                                placeholder="60"
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="task-difficulty" className="text-sm font-semibold text-gray-700">
                                Difficulty (1-10)
                            </label>
                            <Input
                                id="task-difficulty"
                                type="number"
                                min="1"
                                max="10"
                                value={formState.difficulty}
                                onChange={(event) => handleFieldChange("difficulty", event.target.value)}
                                placeholder="5"
                            />
                        </div>
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
                        <Button type="submit" disabled={saving} className="w-full">
                            {saving ? "Creating..." : "Create Task"}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    )
}
