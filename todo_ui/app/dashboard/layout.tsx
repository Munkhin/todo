"use client"
import { AppSidebar } from "@/components/Dashboard/AppSidebar"
import MobileSidebar from "@/components/Dashboard/MobileSidebar"
import { usePathname } from "next/navigation"
import { useEffect } from "react"
import { useUserId } from "@/hooks/use-user-id"
import { detectTimezone, updateUserTimezone } from "@/lib/api/auth"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isSchedule = pathname === "/dashboard/schedule"
  const userId = useUserId()

  // auto-detect and update user timezone on mount
  useEffect(() => {
    // Only update timezone for valid authenticated users
    if (userId && userId > 0) {
      const timezone = detectTimezone()
      updateUserTimezone(userId, timezone)
        .catch((err) => {
          console.error('Failed to update timezone:', err)
        })
    }
  }, [userId])
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
        <main
          className={
            isSchedule
              ? "flex min-h-0 h-full flex-1 flex-col overflow-hidden px-[clamp(1rem,2.5vh,1.5rem)] pb-0 pt-0"
              : "flex min-h-0 h-full flex-1 flex-col overflow-hidden px-[clamp(1rem,2.5vh,1.5rem)] pb-[clamp(1rem,2.5vh,1.5rem)] pt-[clamp(1rem,2.5vh,1.5rem)]"
          }
        >
          {children}
        </main>
      </div>
    </div>
  )
}
