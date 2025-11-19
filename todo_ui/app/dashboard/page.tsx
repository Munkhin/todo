// Dashboard main: simple task view
import TasksView from "@/components/Tasks/TasksView"

export default function DashboardPage() {
  return (
    <div className="w-full min-h-[60svh]">
      <TasksView />
    </div>
  )
}
