/**
 * Event emitter for task-related events
 * Used to coordinate task refresh across components
 */

type TaskEventListener = () => void

class TaskEventEmitter {
  private listeners: TaskEventListener[] = []

  subscribe(listener: TaskEventListener): () => void {
    this.listeners.push(listener)
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  emit(): void {
    this.listeners.forEach((listener) => listener())
  }
}

export const taskEvents = new TaskEventEmitter()
