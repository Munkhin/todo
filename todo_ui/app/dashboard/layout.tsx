import { AppSidebar } from "@/components/Dashboard/AppSidebar"
import MobileSidebar from "@/components/Dashboard/MobileSidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-[100svh] grid-cols-1 md:grid-cols-[260px_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden md:block border-r bg-[hsl(var(--color-sidebar,theme(colors.gray.50)))] sticky top-0 h-[100svh] overflow-auto">
        <AppSidebar />
      </aside>
      {/* Content area with mobile header */}
      <div className="flex min-h-0 h-full flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-40 border-b bg-white/80 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
            <div className="text-lg font-semibold">Todo</div>
            <MobileSidebar />
          </div>
        </header>
        <main className="flex min-h-0 h-full flex-1 flex-col overflow-hidden p-[clamp(1rem,2.5vh,1.5rem)]">{children}</main>
      </div>
    </div>
  )
}
