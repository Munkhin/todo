"use client"
import Link from "next/link"
import { useState } from "react"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { navbarStyles } from "./navbar.styles"

export default function Navbar() {
  const [open, setOpen] = useState(false)

  const links = [
    { href: "#features", label: "Features" },
    { href: "#use-cases", label: "Use Cases" },
    { href: "#pricing", label: "Pricing" },
    { href: "#faq", label: "FAQ" },
  ]

  return (
    <header className={navbarStyles.header}>
      <div className={navbarStyles.container}>
        <div className={navbarStyles.row}>
          <Link href="/" className={navbarStyles.brand}>Todo</Link>
          <nav className={navbarStyles.navList} aria-label="Primary">
            <ul className={navbarStyles.navUl}>
              {links.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className={navbarStyles.navLink}>{l.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className={navbarStyles.ctas}>
          <Link href="/signin" className={navbarStyles.signIn}>Sign In</Link>
          <Link href="/signup" className={navbarStyles.getStarted}>Get Started</Link>
        </div>

        <div className={navbarStyles.mobile}>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className={navbarStyles.mobileTrigger}>
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className={navbarStyles.sheetBody}>
                {links.map((l) => (
                  <div key={l.href}>
                    <a href={l.href} onClick={() => setOpen(false)} className={navbarStyles.sheetLink}>{l.label}</a>
                  </div>
                ))}
                <div className="pt-4">
                  <Link href="/signin" className={navbarStyles.sheetSignIn}>Sign In</Link>
                  <Link href="/signup" className={navbarStyles.sheetGetStarted}>Get Started</Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
