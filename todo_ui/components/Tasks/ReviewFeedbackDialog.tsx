/**
 * Review Feedback Dialog
 * Collects user feedback (0-5 quality rating) after completing a review session
 */

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Star } from "lucide-react"
import { useUserId } from "@/hooks/use-user-id"

interface ReviewFeedbackDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    taskId: number
    taskTitle: string
    onComplete?: () => void
}

const QUALITY_LABELS = [
    "Complete blackout",
    "Incorrect; answer seemed familiar",
    "Incorrect; correct answer remembered",
    "Correct with difficulty",
    "Correct after hesitation",
    "Perfect recall"
]

export function ReviewFeedbackDialog({
    open,
    onOpenChange,
    taskId,
    taskTitle,
    onComplete
}: ReviewFeedbackDialogProps) {
    const userId = useUserId()
    const [rating, setRating] = useState<number | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const submitReview = async () => {
        if (rating === null) return

        setSubmitting(true)
        setError(null)

        try {
            const response = await fetch(`/api/tasks/${taskId}/review?user_id=${userId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ quality_rating: rating })
            })

            if (!response.ok) {
                throw new Error("Failed to submit review")
            }

            const result = await response.json()

            // Show success feedback
            alert(`Review recorded! Next review in ${result.next_interval_days} days`)

            onComplete?.()
            onOpenChange(false)
            setRating(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to submit review")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>How well did you recall?</DialogTitle>
                    <DialogDescription>
                        Rate how well you remembered: <strong>{taskTitle}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6 space-y-3">
                    {[0, 1, 2, 3, 4, 5].map((value) => (
                        <button
                            key={value}
                            onClick={() => setRating(value)}
                            className={`w-full p-4 rounded-lg border-2 transition-all text-left ${rating === value
                                    ? "border-primary bg-primary/10"
                                    : "border-border hover:border-primary/50"
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex">
                                        {Array.from({ length: value + 1 }).map((_, i) => (
                                            <Star
                                                key={i}
                                                className={`h-4 w-4 ${rating === value ? "fill-primary text-primary" : "text-muted-foreground"
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                    <div>
                                        <div className="font-medium">Quality {value}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {QUALITY_LABELS[value]}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {error && (
                    <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                        {error}
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button onClick={submitReview} disabled={rating === null || submitting}>
                        {submitting ? "Submitting..." : "Submit Review"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
