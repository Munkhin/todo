"use client"

import { useState } from "react"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { AppSidebar } from "./AppSidebar"

export function MobileSidebar() {
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50">
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-80 sm:max-w-sm p-0">
        {/* Close on nav click for better UX */}
        <div onClick={() => setOpen(false)}>
          <AppSidebar />
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default MobileSidebar

