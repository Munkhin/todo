"use client"

import { CheckSquare, Calendar, Settings, CreditCard, MessageSquare } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { sidebarStyles } from "./AppSidebar.styles"

// navigation items
const items = [
  {
    title: "Tasks",
    url: "/dashboard",
    icon: CheckSquare,
  },
  {
    title: "Schedule",
    url: "/dashboard/schedule",
    icon: Calendar,
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
  },
  {
    title: "Subscription",
    url: "/dashboard/subscription",
    icon: CreditCard,
  },
  {
    title: "Feedback",
    url: "/dashboard/feedback",
    icon: MessageSquare,
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <nav aria-label="Navigation">
      <div className={`${sidebarStyles.header.border} ${sidebarStyles.header.padding}`}>
        <div className="flex items-center gap-2">
          <CheckSquare className={sidebarStyles.header.logo.iconSize} />
          <span className={`${sidebarStyles.header.logo.textSize} ${sidebarStyles.header.logo.textWeight}`}>Todo</span>
        </div>
      </div>
      <div className="p-2">
        <div className={`${sidebarStyles.groupLabel.padding} ${sidebarStyles.groupLabel.fontSize} text-gray-600`}>Navigation</div>
        <ul className="mt-2 flex flex-col gap-1">
          {items.map((item) => {
            const active = pathname === item.url
            return (
              <li key={item.title}>
                <Link
                  href={item.url}
                  className={`flex items-center ${sidebarStyles.menuItem.gap} ${sidebarStyles.menuItem.padding} rounded-md ${
                    active ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'
                  }`}
                >
                  <item.icon className={sidebarStyles.menuItem.iconSize} />
                  <span className={sidebarStyles.menuItem.fontSize}>{item.title}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
