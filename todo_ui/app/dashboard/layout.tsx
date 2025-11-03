import { AppSidebar } from "@/components/Dashboard/AppSidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-screen grid-cols-[260px_1fr]">
      <aside className="border-r bg-[hsl(var(--color-sidebar,theme(colors.gray.50)))]">
        <AppSidebar />
      </aside>
      <main className="flex min-h-0 h-full flex-1 flex-col overflow-hidden p-6">{children}</main>
    </div>
  )
}
