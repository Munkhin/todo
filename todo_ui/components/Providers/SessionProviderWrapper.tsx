"use client"
import { SessionProvider } from "next-auth/react"
import BackendSessionBridge from "./BackendSessionBridge"

export default function SessionProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <BackendSessionBridge />
      {children}
    </SessionProvider>
  )
}
