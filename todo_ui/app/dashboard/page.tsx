// Dashboard main: simple task view
import TasksView from "@/components/Tasks/TasksView"
import OnboardingOverlay from "@/components/Dashboard/OnboardingOverlay"

export default function DashboardPage() {
  return (
    <div className="w-full min-h-[60svh]">
      <OnboardingOverlay />
      <TasksView />
    </div>
  )
}
