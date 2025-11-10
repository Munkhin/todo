// Dashboard main: simple task view
import TasksView from "@/components/Tasks/TasksView"

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-3xl min-h-[60svh]">
      <TasksView />
    </div>
  )
}
