/**
 * Subjects Manager Component
 * Allows users to add, edit, and delete their subjects in the settings page
 */

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Plus, X, Edit2, Check } from "lucide-react"
import { useUserId } from "@/hooks/use-user-id"

interface Subject {
    id: number
    subject_name: string
    user_id: number
}

export function SubjectsManager() {
    const userId = useUserId()
    const [subjects, setSubjects] = useState<Subject[]>([])
    const [newSubject, setNewSubject] = useState("")
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editValue, setEditValue] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Fetch subjects on mount
    useEffect(() => {
        if (userId) {
            fetchSubjects()
        }
    }, [userId])

    const fetchSubjects = async () => {
        try {
            const response = await fetch(`/api/settings/subjects?user_id=${userId}`)
            if (!response.ok) throw new Error("Failed to fetch subjects")
            const data = await response.json()
            setSubjects(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load subjects")
        }
    }

    const addSubject = async () => {
        if (!newSubject.trim()) return

        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`/api/settings/subjects?user_id=${userId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subject_name: newSubject.trim() })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.detail || "Failed to add subject")
            }

            const newSubjectData = await response.json()
            setSubjects([...subjects, newSubjectData])
            setNewSubject("")
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to add subject")
        } finally {
            setLoading(false)
        }
    }

    const startEdit = (subject: Subject) => {
        setEditingId(subject.id)
        setEditValue(subject.subject_name)
    }

    const cancelEdit = () => {
        setEditingId(null)
        setEditValue("")
    }

    const saveEdit = async (id: number) => {
        if (!editValue.trim()) return

        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`/api/settings/subjects/${id}?user_id=${userId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subject_name: editValue.trim() })
            })

            if (!response.ok) throw new Error("Failed to update subject")

            const updated = await response.json()
            setSubjects(subjects.map(s => s.id === id ? updated : s))
            setEditingId(null)
            setEditValue("")
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update subject")
        } finally {
            setLoading(false)
        }
    }

    const deleteSubject = async (id: number) => {
        if (!confirm("Delete this subject? Tasks using it will need to be reassigned.")) return

        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`/api/settings/subjects/${id}?user_id=${userId}`, {
                method: "DELETE"
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.detail || "Failed to delete subject")
            }

            setSubjects(subjects.filter(s => s.id !== id))
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete subject")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold mb-2">My Subjects</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Manage subjects for better task organization and interleaved study sessions
                </p>
            </div>

            {/* Add new subject */}
            <div className="flex gap-2">
                <Input
                    placeholder="Add new subject (e.g., Mathematics, Physics)"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addSubject()}
                    disabled={loading}
                />
                <Button onClick={addSubject} disabled={loading || !newSubject.trim()}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                </Button>
            </div>

            {/* Error message */}
            {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    {error}
                </div>
            )}

            {/* Subjects list */}
            <div className="space-y-2">
                {subjects.length === 0 && (
                    <Card className="p-4 text-center text-muted-foreground">
                        No subjects yet. Add your first subject above!
                    </Card>
                )}

                {subjects.map((subject) => (
                    <Card key={subject.id} className="p-3 flex items-center justify-between">
                        {editingId === subject.id ? (
                            // Edit mode
                            <div className="flex-1 flex items-center gap-2">
                                <Input
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyPress={(e) => e.key === "Enter" && saveEdit(subject.id)}
                                    className="flex-1"
                                    autoFocus
                                />
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => saveEdit(subject.id)}
                                    disabled={loading}
                                >
                                    <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={cancelEdit}
                                    disabled={loading}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            // View mode
                            <>
                                <span className="font-medium">{subject.subject_name}</span>
                                <div className="flex gap-1">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => startEdit(subject)}
                                        disabled={loading}
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => deleteSubject(subject.id)}
                                        disabled={loading}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </>
                        )}
                    </Card>
                ))}
            </div>
        </div>
    )
}
